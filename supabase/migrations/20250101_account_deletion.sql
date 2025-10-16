-- =====================================================
-- SECURE ACCOUNT DELETION FUNCTION
-- =====================================================

-- This function handles complete user account deletion
-- following GDPR and privacy compliance requirements
CREATE OR REPLACE FUNCTION delete_user_account(user_uuid UUID)
RETURNS jsonb AS $$
DECLARE
    deletion_record record;
    affected_rows integer := 0;
BEGIN
    -- Verify the user exists and get basic info
    SELECT first_name, last_name, email INTO deletion_record
    FROM users 
    WHERE user_id = user_uuid AND deleted_at IS NULL;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'User not found or already deleted'
        );
    END IF;
    
    -- Log the deletion request
    INSERT INTO activity_logs (
        user_id,
        action,
        resource_type,
        resource_id,
        metadata,
        category,
        severity
    ) VALUES (
        user_uuid,
        'account_deletion_initiated',
        'user_account',
        user_uuid,
        jsonb_build_object(
            'deletion_timestamp', NOW(),
            'user_name', deletion_record.first_name || ' ' || deletion_record.last_name,
            'user_email', deletion_record.email
        ),
        'account',
        'warning'
    );
    
    -- Step 1: Soft delete the user first (marks as deleted but preserves for audit)
    UPDATE users 
    SET 
        deleted_at = NOW(),
        status = 'deleted',
        -- Anonymize sensitive data immediately
        email = 'deleted_' || user_uuid || '@deleted.local',
        phone_number = NULL,
        first_name = 'Deleted',
        last_name = 'User'
    WHERE user_id = user_uuid;
    
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    
    -- Step 2: Remove from organization memberships
    DELETE FROM organization_members WHERE user_id = user_uuid;
    
    -- Step 3: Anonymize point appeals (keep for audit but remove personal info)
    UPDATE point_appeals 
    SET 
        appeal_reason = '[REDACTED - User deleted]',
        picture_url = NULL
    WHERE user_id = user_uuid;
    
    -- Step 4: Remove user sessions
    DELETE FROM user_sessions WHERE user_id = user_uuid;
    
    -- Step 5: Remove user roles
    DELETE FROM user_roles WHERE user_id = user_uuid;
    
    -- Step 6: Anonymize notifications
    UPDATE notifications 
    SET 
        title = '[REDACTED]',
        body = '[REDACTED - User deleted]',
        data = '{}',
        status = 'deleted'
    WHERE user_id = user_uuid;
    
    -- Step 7: Anonymize event feedback
    UPDATE event_feedback 
    SET 
        comments = '[REDACTED - User deleted]'
    WHERE user_id = user_uuid;
    
    -- Step 8: Anonymize admin feedback
    UPDATE admin_feedback 
    SET 
        subject = '[REDACTED]',
        message = '[REDACTED - User deleted]'
    WHERE user_id = user_uuid;
    
    -- Step 9: Mark files for deletion (actual file deletion should be handled by a cleanup job)
    UPDATE files 
    SET 
        status = 'deleted',
        filename = 'deleted_file_' || id,
        original_filename = '[REDACTED]'
    WHERE user_id = user_uuid;
    
    -- Step 10: Keep activity logs but mark them as from deleted user
    -- (Important for audit trails - don't delete these)
    UPDATE activity_logs 
    SET metadata = metadata || jsonb_build_object('user_deleted', true)
    WHERE user_id = user_uuid;
    
    -- Step 11: Keep points and attendance records for organizational integrity
    -- but they're now associated with a deleted user
    -- (This maintains data integrity for leaderboards and statistics)
    
    -- Final audit log
    INSERT INTO activity_logs (
        user_id,
        action,
        resource_type,
        resource_id,
        metadata,
        category,
        severity
    ) VALUES (
        user_uuid,
        'account_deletion_completed',
        'user_account',
        user_uuid,
        jsonb_build_object(
            'deletion_completed_at', NOW(),
            'anonymization_complete', true,
            'data_retention_policy', '30_days_for_complete_removal'
        ),
        'account',
        'info'
    );
    
    -- Return success with summary
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Account deletion initiated successfully',
        'user_id', user_uuid,
        'deletion_timestamp', NOW(),
        'next_steps', 'Complete data removal will occur within 30 days'
    );
    
EXCEPTION
    WHEN OTHERS THEN
        -- Log the error
        INSERT INTO activity_logs (
            user_id,
            action,
            resource_type,
            resource_id,
            metadata,
            category,
            severity
        ) VALUES (
            user_uuid,
            'account_deletion_failed',
            'user_account',
            user_uuid,
            jsonb_build_object(
                'error_code', SQLSTATE,
                'error_message', SQLERRM,
                'failure_timestamp', NOW()
            ),
            'account',
            'error'
        );
        
        -- Return error
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Account deletion failed: ' || SQLERRM,
            'error_code', SQLSTATE
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- PRIVACY COMPLIANCE UTILITIES
-- =====================================================

-- Function to check if a user can be completely purged (after retention period)
CREATE OR REPLACE FUNCTION can_purge_user_data(user_uuid UUID)
RETURNS boolean AS $$
BEGIN
    -- Check if user was deleted more than 30 days ago
    RETURN EXISTS (
        SELECT 1 FROM users 
        WHERE user_id = user_uuid 
        AND deleted_at IS NOT NULL 
        AND deleted_at < NOW() - INTERVAL '30 days'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function for complete data purge (to be run by scheduled cleanup job)
CREATE OR REPLACE FUNCTION purge_user_data(user_uuid UUID)
RETURNS jsonb AS $$
BEGIN
    -- Only allow purge if retention period has passed
    IF NOT can_purge_user_data(user_uuid) THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'User data cannot be purged yet - retention period not met'
        );
    END IF;
    
    -- Complete removal of all user data
    DELETE FROM event_attendance WHERE user_id = user_uuid;
    DELETE FROM points WHERE user_id = user_uuid;
    DELETE FROM point_appeals WHERE user_id = user_uuid;
    DELETE FROM notifications WHERE user_id = user_uuid;
    DELETE FROM event_feedback WHERE user_id = user_uuid;
    DELETE FROM admin_feedback WHERE user_id = user_uuid;
    DELETE FROM files WHERE user_id = user_uuid;
    DELETE FROM activity_logs WHERE user_id = user_uuid;
    DELETE FROM security_events WHERE user_id = user_uuid;
    DELETE FROM users WHERE user_id = user_uuid;
    
    RETURN jsonb_build_object(
        'success', true,
        'message', 'User data completely purged',
        'purged_at', NOW()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- RLS POLICIES FOR DELETION FUNCTIONS
-- =====================================================

-- Only authenticated users can delete their own account
CREATE POLICY "users_can_delete_own_account" ON users
    FOR UPDATE USING (user_id = auth.uid() AND deleted_at IS NULL);

-- System admins can purge user data after retention period
-- (This would be called by a scheduled job, not directly by users)

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION delete_user_account(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION can_purge_user_data(UUID) TO authenticated;

-- Only service role should be able to purge data
GRANT EXECUTE ON FUNCTION purge_user_data(UUID) TO service_role;