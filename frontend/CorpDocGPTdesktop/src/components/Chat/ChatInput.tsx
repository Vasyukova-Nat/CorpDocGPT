import React, { useState } from 'react';
import {
  Box,
  TextField,
  IconButton,
  Paper,
  Tooltip,
} from '@mui/material';
import {
  Send as SendIcon,
} from '@mui/icons-material';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export const ChatInput: React.FC<ChatInputProps> = ({ 
  onSendMessage, 
  disabled = false,
  placeholder = "Задайте вопрос о документах университета..."
}) => {
  const [message, setMessage] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !disabled) {
      onSendMessage(message.trim());
      setMessage('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <Paper
      component="form"
      onSubmit={handleSubmit}
      elevation={0}
      sx={{
        p: 0,
        borderRadius: 2,
        backgroundColor: 'transparent',
        position: 'relative',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <TextField
          fullWidth
          multiline
          maxRows={4}
          placeholder={placeholder}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          variant="outlined"
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: 2,
              backgroundColor: 'background.paper',
              '& textarea': {
                resize: 'none',
                minHeight: '20px',
                maxHeight: '80px',
                lineHeight: '20px',
                padding: '12px 16px',
                fontSize: '0.9rem',
              },
              '& fieldset': {
                border: 'none',
              },
              '&:hover fieldset': {
                border: 'none',
              },
              '&.Mui-focused fieldset': {
                border: 'none',
                boxShadow: '0 0 0 2px rgba(25, 118, 210, 0.2)',
              },
            },
          }}
        />
        
        <Tooltip title="Отправить сообщение">
          <IconButton
            type="submit"
            disabled={!message.trim() || disabled}
            sx={{
              height: '48px',
              width: '48px',
              backgroundColor: 'primary.main',
              color: 'white',
              '&:hover': {
                backgroundColor: 'primary.dark',
              },
              '&:disabled': {
                backgroundColor: 'action.disabled',
              },
            }}
          >
            <SendIcon sx={{ fontSize: 20 }} />
          </IconButton>
        </Tooltip>
      </Box>
    </Paper>
  );
};