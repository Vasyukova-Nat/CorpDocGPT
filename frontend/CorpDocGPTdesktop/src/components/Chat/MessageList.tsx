import React from 'react';
import { Box } from '@mui/material';
import { MessageBubble } from './MessageBubble';
import { ChatMessage } from '../../types';

interface MessageListProps {
  messages: ChatMessage[];
  isLoading: boolean;
}

export const MessageList: React.FC<MessageListProps> = ({ messages, isLoading }) => {
  return (
    <Box>
      {messages.map((message, index) => (
        <MessageBubble 
          key={message.id} 
          message={message}
          isLast={index === messages.length - 1}
          isLoading={isLoading && message.role === 'assistant' && message.status === 'streaming'}
        />
      ))}
    </Box>
  );
};