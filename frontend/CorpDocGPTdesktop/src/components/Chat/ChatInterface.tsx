import React, { useState, useRef, useEffect } from 'react';
import { Box, Container, Fade, Alert } from '@mui/material';
import { MessageList } from './MessageList';
import { ChatInput } from './ChatInput';
import { Logo } from '../Common/Logo';
import { ChatMessage } from '../../types';
import { apiService } from '../../services/api';

interface ChatInterfaceProps {
  chatId?: string;
  messages: ChatMessage[];
  onNewMessage: (message: ChatMessage, isUser: boolean) => void;
  onUpdateMessage: (messageId: string, updates: Partial<ChatMessage>) => void;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({  
  messages, 
  onNewMessage,
  onUpdateMessage 
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (content: string) => {
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: new Date().toISOString(),
    };

    onNewMessage(userMessage, true);
    setIsLoading(true);
    setError(null);

    const assistantMessageId = (Date.now() + 1).toString();
    const tempAssistantMessage: ChatMessage = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      timestamp: new Date().toISOString(),
      isStreaming: false,
      status: 'thinking',
    };
  
    onNewMessage(tempAssistantMessage, false);

    let currentContent = '';

    try {
      await apiService.queryDocumentsStream(content, (chunk) => {
        switch (chunk.type) {
          case 'sources':
            onUpdateMessage(assistantMessageId, {
              sources: chunk.sources,
            });
            break;

          case 'content':
            if (chunk.content) {
              currentContent += chunk.content;
            
              if (currentContent === chunk.content) {
                onUpdateMessage(assistantMessageId, {
                  content: currentContent,
                  isStreaming: !chunk.done,
                  status: 'streaming',
                  timestamp: new Date().toISOString(),
                });
              } else {
                onUpdateMessage(assistantMessageId, {
                  content: currentContent,
                  isStreaming: !chunk.done,
                  status: chunk.done ? 'completed' : 'streaming',
                });
              }
            }
         
            if (chunk.done) {
              onUpdateMessage(assistantMessageId, {
                content: currentContent,
                isStreaming: false,
                status: 'completed',
              });
            }
            break;

          case 'error':
            setError(chunk.content);
            onUpdateMessage(assistantMessageId, {
              content: `Ошибка: ${chunk.content}`,
              isStreaming: false,
              status: 'completed',
            });
            break;
        }
      });
    } catch (error) {
      console.error('Streaming error:', error);
      setError('Ошибка при отправке сообщения');
      
      onUpdateMessage(assistantMessageId, {
        content: 'Извините, произошла ошибка. Пожалуйста, попробуйте еще раз.',
        isStreaming: false,
        status: 'completed',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {error && (
        <Alert severity="error" sx={{ m: 2, mb: 0 }}>
          {error}
        </Alert>
      )}
      
      {messages.length <= 1 ? (
        <Fade in={true} timeout={500}>
          <Box sx={{ 
            flex: 1, 
            display: 'flex', 
            flexDirection: 'column', 
            justifyContent: 'center',
            alignItems: 'center',
            textAlign: 'center',
            px: 2
          }}>
            <Logo size="large" forceWhite={true} />
            <Box sx={{ mt: 6, width: '100%', maxWidth: 800 }}>
              <ChatInput 
                onSendMessage={handleSendMessage}
                placeholder="Задайте вопрос о документах университета, учебном процессе или регламентах..."
              />
            </Box>
          </Box>
        </Fade>
      ) : (
        <>
          <Box sx={{ flex: 1, overflow: 'auto' }}>
            <Container maxWidth="lg" sx={{ py: 2 }}>
              <MessageList 
                messages={messages} 
                isLoading={isLoading}
              />
              <div ref={messagesEndRef} />
            </Container>
          </Box>
          <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
            <Container maxWidth="lg">
              <ChatInput 
                onSendMessage={handleSendMessage}
                disabled={isLoading}
                placeholder="Задайте следующий вопрос..."
              />
            </Container>
          </Box>
        </>
      )}
    </Box>
  );
};