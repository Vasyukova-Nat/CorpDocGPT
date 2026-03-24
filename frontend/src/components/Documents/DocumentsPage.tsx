import React from 'react';
import { Container, Box, Typography } from '@mui/material';
import { DocumentList } from './DocumentList';
import { UploadArea } from './UploadArea';
import { StatusIndicator } from '../Common/StatusIndicator';

export const DocumentsPage: React.FC = () => {
  return (
    <Container maxWidth="lg" sx={{ py: 3, height: '100%' }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom fontWeight="bold">
          База знаний документов
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Загружайте и управляйте документами для обучения AI ассистента
        </Typography>
      </Box>

      <StatusIndicator />
      
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <UploadArea />
        <DocumentList />
      </Box>
    </Container>
  );
};