    } catch (error) {
      console.error('💥 Feedback submission error:', error);
      
      // More specific error messages
      if (error && typeof error === 'object' && 'code' in error) {
        const dbError = error as any;
        if (dbError.code === '42501') {
          Alert.alert(
            'Permission Error', 
            'There seems to be a database permission issue. Please contact an administrator.'
          );
        } else if (dbError.code === '23505') {
          Alert.alert(
            'Duplicate Entry', 
            'It looks like you may have already submitted this feedback. Please try with different content.'
          );
        } else {
          Alert.alert(
            'Database Error', 
            `Error ${dbError.code}: ${dbError.message || 'Unknown database error'}`
          );
        }
      } else {
        Alert.alert(
          'Submission Failed', 
          error instanceof Error 
            ? `Error: ${error.message}` 
            : 'Could not send feedback. Please try again.'
        );
      }
    } finally {
      setSubmittingFeedback(false);
    }
