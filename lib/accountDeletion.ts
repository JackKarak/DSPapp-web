/**
 * Account deletion utilities with GDPR compliance
 */

import { supabase } from './supabase';
import { logger, sanitizeForLog } from './logger';

export interface AccountDeletionResult {
  success: boolean;
  message?: string;
  error?: string;
  user_id?: string;
  deletion_timestamp?: string;
}

export class AccountDeletionService {
  /**
   * Initiate account deletion process
   * This will soft-delete the user and anonymize sensitive data
   */
  static async deleteAccount(userId: string): Promise<AccountDeletionResult> {
    try {
      logger.info('Initiating account deletion', { userId: sanitizeForLog(userId) });

      // Call the database function for secure deletion
      const { data, error } = await supabase.rpc('delete_user_account', {
        user_uuid: userId
      });

      if (error) {
        logger.error('Account deletion database error', sanitizeForLog(error));
        return {
          success: false,
          error: `Database error: ${error.message}`
        };
      }

      if (data && !data.success) {
        logger.error('Account deletion failed', sanitizeForLog(data));
        return {
          success: false,
          error: data.error || 'Unknown deletion error'
        };
      }

      logger.info('Account deletion successful', sanitizeForLog(data));
      return {
        success: true,
        message: data.message || 'Account deletion initiated successfully',
        user_id: data.user_id,
        deletion_timestamp: data.deletion_timestamp
      };

    } catch (error) {
      logger.error('Unexpected account deletion error', sanitizeForLog(error));
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unexpected error occurred'
      };
    }
  }

  /**
   * Check if user data can be completely purged (after retention period)
   */
  static async canPurgeUserData(userId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase.rpc('can_purge_user_data', {
        user_uuid: userId
      });

      if (error) {
        logger.error('Error checking purge eligibility', sanitizeForLog(error));
        return false;
      }

      return data || false;
    } catch (error) {
      logger.error('Unexpected error checking purge eligibility', sanitizeForLog(error));
      return false;
    }
  }

  /**
   * Get account deletion status for a user
   */
  static async getAccountDeletionStatus(userId: string): Promise<{
    isDeleted: boolean;
    deletedAt?: string;
    canPurge: boolean;
    daysUntilPurge?: number;
  }> {
    try {
      const { data: user, error } = await supabase
        .from('users')
        .select('deleted_at, status')
        .eq('user_id', userId)
        .single();

      if (error || !user) {
        return {
          isDeleted: false,
          canPurge: false
        };
      }

      const isDeleted = user.deleted_at !== null;
      const canPurge = isDeleted ? await this.canPurgeUserData(userId) : false;

      let daysUntilPurge: number | undefined;
      if (isDeleted && user.deleted_at) {
        const deletedDate = new Date(user.deleted_at);
        const purgeDate = new Date(deletedDate);
        purgeDate.setDate(purgeDate.getDate() + 30); // 30-day retention period
        
        const now = new Date();
        const msUntilPurge = purgeDate.getTime() - now.getTime();
        daysUntilPurge = Math.max(0, Math.ceil(msUntilPurge / (1000 * 60 * 60 * 24)));
      }

      return {
        isDeleted,
        deletedAt: user.deleted_at,
        canPurge,
        daysUntilPurge
      };

    } catch (error) {
      logger.error('Error getting account deletion status', sanitizeForLog(error));
      return {
        isDeleted: false,
        canPurge: false
      };
    }
  }

  /**
   * Request account recovery (within 7 days of deletion)
   */
  static async requestAccountRecovery(userId: string, recoveryReason: string): Promise<AccountDeletionResult> {
    try {
      const status = await this.getAccountDeletionStatus(userId);
      
      if (!status.isDeleted) {
        return {
          success: false,
          error: 'Account is not deleted'
        };
      }

      if (!status.deletedAt) {
        return {
          success: false,
          error: 'Deletion date not found'
        };
      }

      // Check if within 7-day recovery window
      const deletedDate = new Date(status.deletedAt);
      const recoveryDeadline = new Date(deletedDate);
      recoveryDeadline.setDate(recoveryDeadline.getDate() + 7);
      
      const now = new Date();
      if (now > recoveryDeadline) {
        return {
          success: false,
          error: 'Recovery period has expired (7 days after deletion)'
        };
      }

      // Log recovery request (would need admin approval)
      const { error: logError } = await supabase
        .from('activity_logs')
        .insert({
          user_id: userId,
          action: 'account_recovery_requested',
          resource_type: 'user_account',
          resource_id: userId,
          metadata: {
            recovery_reason: recoveryReason,
            request_timestamp: now.toISOString(),
            days_since_deletion: Math.floor((now.getTime() - deletedDate.getTime()) / (1000 * 60 * 60 * 24))
          },
          category: 'account',
          severity: 'warning'
        });

      if (logError) {
        logger.error('Error logging recovery request', sanitizeForLog(logError));
      }

      return {
        success: true,
        message: 'Account recovery request submitted. An administrator will review your request.'
      };

    } catch (error) {
      logger.error('Error requesting account recovery', sanitizeForLog(error));
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unexpected error occurred'
      };
    }
  }

  /**
   * Get data export for user (before deletion)
   */
  static async exportUserData(userId: string): Promise<{
    success: boolean;
    data?: any;
    error?: string;
  }> {
    try {
      // Fetch all user data for export
      const [
        { data: profile },
        { data: events },
        { data: points },
        { data: appeals },
        { data: feedback }
      ] = await Promise.all([
        supabase.from('users').select('*').eq('user_id', userId).single(),
        supabase.from('event_attendance').select('*, events(*)').eq('user_id', userId),
        supabase.from('points').select('*').eq('user_id', userId),
        supabase.from('point_appeal').select('*').eq('user_id', userId),
        supabase.from('event_feedback').select('*').eq('user_id', userId)
      ]);

      const exportData = {
        profile: profile || {},
        events: events || [],
        points: points || [],
        appeals: appeals || [],
        feedback: feedback || [],
        export_timestamp: new Date().toISOString(),
        export_format_version: '1.0'
      };

      return {
        success: true,
        data: exportData
      };

    } catch (error) {
      logger.error('Error exporting user data', sanitizeForLog(error));
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Export failed'
      };
    }
  }
}

// Privacy compliance helpers
export const PrivacyCompliance = {
  /**
   * Generate privacy report for user
   */
  async generatePrivacyReport(userId: string) {
    const status = await AccountDeletionService.getAccountDeletionStatus(userId);
    
    return {
      user_id: userId,
      account_status: status.isDeleted ? 'deleted' : 'active',
      deleted_at: status.deletedAt,
      data_retention_period: '30 days',
      can_request_recovery: status.isDeleted && (status.daysUntilPurge || 0) > 23, // Within 7 days
      complete_purge_in_days: status.daysUntilPurge,
      rights: {
        data_export: 'Available before deletion',
        data_correction: 'Available while account is active',
        data_deletion: 'Available at any time',
        account_recovery: 'Available within 7 days of deletion'
      },
      compliance_standards: ['GDPR', 'CCPA', 'COPPA'],
      generated_at: new Date().toISOString()
    };
  }
};