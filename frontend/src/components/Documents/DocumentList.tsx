import React, { useState } from 'react';
import {
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  IconButton,
  Typography,
  Box,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Alert,
  CircularProgress,
  Tooltip,
  useTheme,
} from '@mui/material';
import {
  Description as DocumentIcon,
  Delete as DeleteIcon,
  PictureAsPdf as PdfIcon,
  Article as WordIcon,
  TextSnippet as TextIcon,
  Cloud as CloudIcon,
} from '@mui/icons-material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiService } from '../../services/api';
import { Document } from '../../types';

export const DocumentList: React.FC = () => {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const queryClient = useQueryClient();
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';

  // Запрос для получения реального списка документов
  const { 
    data: documents = [], 
    isLoading, 
    error,
    refetch
  } = useQuery({
    queryKey: ['documents'],
    queryFn: apiService.getDocuments,
    retry: 2,
  });

  // Мутация для удаления документа
  const deleteMutation = useMutation({
    mutationFn: (documentId: string) => apiService.deleteDocument(documentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      queryClient.invalidateQueries({ queryKey: ['health'] });
      setDeleteDialogOpen(false);
      setSelectedDocument(null);
    },
    onError: (error) => {
      console.error('Error deleting document:', error);
    },
  });

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getFileIcon = (filename: string) => {
    const extension = filename.split('.').pop()?.toLowerCase();
    const iconColor = isDarkMode ? 'white' : 'inherit';
    
    switch (extension) {
      case 'pdf':
        return <PdfIcon sx={{ color: iconColor }} />;
      case 'docx':
      case 'doc':
        return <WordIcon sx={{ color: iconColor }} />;
      case 'txt':
        return <TextIcon sx={{ color: iconColor }} />;
      default:
        return <DocumentIcon sx={{ color: iconColor }} />;
    }
  };

  const getFileTypeColor = (filename: string) => {
    const extension = filename.split('.').pop()?.toLowerCase();
    
    const colors: { [key: string]: string } = {
      pdf: '#ff4444',
      docx: '#2196f3',
      doc: '#2196f3',
      txt: '#4caf50',
    };
    
    return colors[extension || ''] || (isDarkMode ? '#666666' : '#999999');
  };

  const getFileTypeBackgroundColor = (filename: string) => {
    const extension = filename.split('.').pop()?.toLowerCase();
    
    // Фоновые цвета для разных типов файлов
    const bgColors: { [key: string]: string } = {
      pdf: isDarkMode ? 'rgba(255, 68, 68, 0.2)' : 'rgba(255, 68, 68, 0.1)',
      docx: isDarkMode ? 'rgba(33, 150, 243, 0.2)' : 'rgba(33, 150, 243, 0.1)',
      doc: isDarkMode ? 'rgba(33, 150, 243, 0.2)' : 'rgba(33, 150, 243, 0.1)',
      txt: isDarkMode ? 'rgba(76, 175, 80, 0.2)' : 'rgba(76, 175, 80, 0.1)',
    };
    
    return bgColors[extension || ''] || (isDarkMode ? 'rgba(102, 102, 102, 0.2)' : 'rgba(153, 153, 153, 0.1)');
  };

  const handleDeleteClick = (document: Document) => {
    setSelectedDocument(document);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (selectedDocument) {
      deleteMutation.mutate(selectedDocument.id);
    }
  };

  const handleRetry = () => {
    refetch();
  };

  if (isLoading) {
    return (
      <Paper elevation={2} sx={{ p: 4, textAlign: 'center' }}>
        <CircularProgress />
        <Typography variant="body1" sx={{ mt: 2, color: isDarkMode ? 'white' : 'inherit' }}>
          Загрузка документов...
        </Typography>
      </Paper>
    );
  }

  if (error) {
    return (
      <Paper elevation={2} sx={{ p: 3 }}>
        <Alert 
          severity="error"
          action={
            <Button color="inherit" size="small" onClick={handleRetry}>
              Повторить
            </Button>
          }
        >
          Ошибка при загрузке документов. Пожалуйста, попробуйте позже.
        </Alert>
      </Paper>
    );
  }

  return (
    <>
      <Paper elevation={2} sx={{ p: 3, backgroundColor: isDarkMode ? 'background.paper' : 'background.default' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h6" fontWeight="bold" color={isDarkMode ? 'white' : 'inherit'}>
            Загруженные документы ({documents.length})
          </Typography>
          
          <Chip 
            icon={<CloudIcon sx={{ color: isDarkMode ? 'white' : 'primary.main' }} />}
            label={`Общий размер: ${formatFileSize(documents.reduce((total, doc) => total + doc.size, 0))}`}
            variant="outlined"
            color="primary"
            sx={{
              color: isDarkMode ? 'white' : 'primary.main',
              borderColor: isDarkMode ? 'rgba(255,255,255,0.3)' : 'primary.main',
              '& .MuiChip-icon': {
                color: isDarkMode ? 'white' : 'primary.main',
              },
            }}
          />
        </Box>

        {documents.length > 0 ? (
          <List sx={{ maxHeight: 500, overflow: 'auto' }}>
            {documents.map((doc) => (
              <ListItem
                key={doc.id}
                sx={{
                  border: 1,
                  borderColor: isDarkMode ? 'rgba(255,255,255,0.2)' : 'divider',
                  borderRadius: 2,
                  mb: 1,
                  backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'background.paper',
                  '&:hover': {
                    backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'action.hover',
                  },
                  transition: 'all 0.2s',
                }}
              >
                <ListItemIcon>
                  {getFileIcon(doc.filename)}
                </ListItemIcon>
                
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                      <Typography 
                        variant="body1" 
                        fontWeight="medium"
                        sx={{ 
                          wordBreak: 'break-word',
                          maxWidth: { xs: '200px', sm: '300px', md: '400px' },
                          color: isDarkMode ? 'white' : 'inherit',
                        }}
                      >
                        {doc.filename}
                      </Typography>
                      <Chip
                        label={doc.filename.split('.').pop()?.toUpperCase()}
                        size="small"
                        sx={{
                          backgroundColor: getFileTypeBackgroundColor(doc.filename),
                          color: getFileTypeColor(doc.filename),
                          fontWeight: 'bold',
                          border: `1px solid ${getFileTypeColor(doc.filename)}`,
                          '&:hover': {
                            backgroundColor: getFileTypeColor(doc.filename),
                            color: 'white',
                          },
                        }}
                      />
                    </Box>
                  }
                  secondary={
                    <Box sx={{ display: 'flex', gap: 2, mt: 0.5, flexWrap: 'wrap' }}>
                      <Typography variant="caption" sx={{ color: isDarkMode ? 'rgba(255,255,255,0.7)' : 'text.secondary' }}>
                        Загружен: {formatDate(doc.uploadDate)}
                      </Typography>
                      <Typography variant="caption" sx={{ color: isDarkMode ? 'rgba(255,255,255,0.7)' : 'text.secondary' }}>
                        Размер: {formatFileSize(doc.size)}
                      </Typography>
                      <Typography variant="caption" sx={{ color: isDarkMode ? 'rgba(255,255,255,0.7)' : 'text.secondary' }}>
                        ID: {doc.id}
                      </Typography>
                    </Box>
                  }
                />
                
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Tooltip title="Удалить">
                    <IconButton 
                      onClick={() => handleDeleteClick(doc)}
                      size="small"
                      color="error"
                      sx={{ 
                        color: isDarkMode ? 'white' : 'inherit',
                      }}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Tooltip>
                </Box>
              </ListItem>
            ))}
          </List>
        ) : (
          <Box sx={{ textAlign: 'center', py: 6 }}>
            <DocumentIcon sx={{ 
              fontSize: 64, 
              mb: 2, 
              opacity: 0.5,
              color: isDarkMode ? 'white' : 'text.secondary',
            }} />
            <Typography variant="h6" gutterBottom sx={{ color: isDarkMode ? 'white' : 'text.secondary' }}>
              Нет загруженных документов
            </Typography>
            <Typography variant="body2" sx={{ color: isDarkMode ? 'rgba(255,255,255,0.7)' : 'text.secondary' }}>
              Загрузите первый документ, чтобы начать работу с базой знаний
            </Typography>
          </Box>
        )}
      </Paper>

      {/* Диалог удаления */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => !deleteMutation.isPending && setDeleteDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Удаление документа</DialogTitle>
        <DialogContent>
          <Typography>
            Вы уверены, что хотите удалить документ "{selectedDocument?.filename}"?
          </Typography>
          <Alert severity="warning" sx={{ mt: 2 }}>
            Это действие нельзя отменить. Документ будет полностью удален из базы знаний.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setDeleteDialogOpen(false)}
            disabled={deleteMutation.isPending}
          >
            Отмена
          </Button>
          <Button 
            onClick={handleDeleteConfirm}
            color="error"
            variant="contained"
            disabled={deleteMutation.isPending}
            startIcon={deleteMutation.isPending ? <CircularProgress size={16} /> : <DeleteIcon />}
          >
            {deleteMutation.isPending ? 'Удаление...' : 'Удалить'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};