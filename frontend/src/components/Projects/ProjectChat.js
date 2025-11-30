import React, { useState, useEffect, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from 'react-query';
import { useAuth } from '../../contexts/AuthContext';
import { projectsAPI } from '../../services/api';
import Button from '../UI/Button';
import Input from '../UI/Input';
import { Send, MessageSquare, Users, Clock, Paperclip, Mic, Image, Video, FileText, X } from 'lucide-react';
import toast from 'react-hot-toast';

const ProjectChat = ({ projectId, projectName }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  console.log('ProjectChat rendered with:', { projectId, projectName, userId: user?.id });
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [attachment, setAttachment] = useState(null);
  const [recording, setRecording] = useState(false);
  const [showAttachmentOptions, setShowAttachmentOptions] = useState(false);
  const mediaRecorderRef = useRef(null);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const [timeTick, setTimeTick] = useState(Date.now());

  // Fetch project messages with real-time updates
  const { data: messagesResp, isLoading, error: messagesError } = useQuery(
    ['project-messages', projectId],
    () => {
      console.log('Fetching messages for project:', projectId);
      return projectsAPI.getProjectMessages(projectId);
    },
    {
      enabled: !!projectId,
      refetchInterval: 2000, // Refresh every 2 seconds for real-time feel
      onSuccess: (data) => {
        console.log('Messages fetched successfully:', data);
      },
      onError: (error) => {
        console.error('Error fetching messages:', error);
        console.error('Error details:', error.response?.data);
      }
    }
  );

  // Send message mutation
  const sendMessageMutation = useMutation(
    (messageData) => projectsAPI.createProjectMessage(projectId, messageData),
    {
      onSuccess: () => {
        setNewMessage('');
        queryClient.invalidateQueries(['project-messages', projectId]);
        toast.success('Message sent!');
      },
      onError: (error) => {
        console.error('Send message error:', error);
        
        // Show specific error message
        if (error.response?.data?.content) {
          toast.error(error.response.data.content[0] || 'Invalid message content');
        } else if (error.response?.status === 403) {
          toast.error('You must be a project member to send messages');
        } else if (error.response?.status === 400) {
          toast.error('Invalid message. Please check your input.');
        } else {
          toast.error('Failed to send message. Please try again.');
        }
      },
    }
  );

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messagesResp]);

  // Re-render periodically so relative times stay accurate
  useEffect(() => {
    const interval = setInterval(() => setTimeTick(Date.now()), 30000); // every 30s
    return () => clearInterval(interval);
  }, []);

  // Normalize response
  const messages = Array.isArray(messagesResp)
    ? messagesResp
    : (Array.isArray(messagesResp?.data)
        ? messagesResp.data
        : (messagesResp?.data?.results || []));

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!newMessage.trim() && !attachment) return;

    const messageData = {
      content: newMessage.trim() || (attachment ? `[${getAttachmentType(attachment)}]` : ''),
    };
    
    // For now, just send the message without attachment until backend supports it
    // TODO: Implement file upload when backend is ready
    if (attachment) {
      console.log('Attachment selected:', attachment.name, attachment.type);
      const attachmentType = getAttachmentType(attachment);
      const emoji = getAttachmentEmoji(attachment);
      messageData.content = `${emoji} ${attachmentType}: ${attachment.name}`;
    }
    
    console.log('Sending message:', messageData);
    sendMessageMutation.mutate(messageData);
    setAttachment(null);
    setShowAttachmentOptions(false);
  };

  const getAttachmentType = (file) => {
    if (file.type.includes('audio')) return 'Voice message';
    if (file.type.includes('video')) return 'Video';
    if (file.type.includes('image')) return 'Image';
    if (file.type.includes('pdf')) return 'PDF';
    return 'File';
  };

  const getAttachmentEmoji = (file) => {
    if (file.type.includes('audio')) return '🎤';
    if (file.type.includes('video')) return '🎥';
    if (file.type.includes('image')) return '🖼️';
    if (file.type.includes('pdf')) return '📄';
    return '📎';
  };

  const handleFileSelect = (fileType) => {
    const input = document.createElement('input');
    input.type = 'file';
    
    switch (fileType) {
      case 'image':
        input.accept = 'image/*';
        break;
      case 'video':
        input.accept = 'video/*';
        break;
      case 'pdf':
        input.accept = '.pdf';
        break;
      case 'audio':
        input.accept = 'audio/*';
        break;
      default:
        input.accept = '*';
    }
    
    input.onchange = (e) => {
      const file = e.target.files?.[0];
      if (file) {
        setAttachment(file);
        setShowAttachmentOptions(false);
      }
    };
    
    input.click();
  };

  const handleTyping = (e) => {
    setNewMessage(e.target.value);
    
    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Set typing indicator
    setIsTyping(true);
    
    // Clear typing indicator after 1 second of no typing
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
    }, 1000);
  };

  const formatMessageTime = (timestamp) => {
    // Ensure we use the actual message time; timeTick is referenced so this recomputes periodically
    void timeTick; // referenced to trigger re-render
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHr = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHr / 24);

    if (diffSec < 10) return 'Just now';
    if (diffSec < 60) return `${diffSec}s ago`;
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHr < 24) return `${diffHr}h ago`;
    if (diffDay === 1) return `Yesterday ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    return date.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const isMyMessage = (message) => {
    return message.author === user?.id;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (messagesError) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <MessageSquare className="h-12 w-12 text-red-400 mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Failed to load chat</h3>
        <p className="text-gray-600 mb-4">
          {messagesError.response?.status === 403 
            ? 'You must be a project member to view messages'
            : messagesError.response?.status === 404
            ? 'Project not found'
            : 'Unable to load messages. Please try again.'}
        </p>
        <Button
          onClick={() => window.location.reload()}
          variant="outline"
          size="sm"
        >
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white rounded-lg border border-gray-200">
      {/* Chat Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-600 rounded-lg">
            <MessageSquare className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 text-lg">Project Chat</h3>
            <p className="text-sm text-blue-600 font-medium">{projectName}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-600 bg-white px-3 py-1 rounded-full">
          <Users className="h-4 w-4" />
          <span className="font-medium">{messages?.length || 0} messages</span>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[300px] max-h-[400px]">
        {messages && messages.length > 0 ? (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${isMyMessage(message) ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[70%] rounded-2xl px-4 py-3 shadow-sm ${
                  isMyMessage(message)
                    ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white'
                    : 'bg-gradient-to-r from-gray-100 to-gray-50 text-gray-900 border border-gray-200'
                }`}
              >
                {!isMyMessage(message) && (
                  <div className="text-xs font-medium mb-1 opacity-75">
                    {message.author_name || 'Unknown User'}
                  </div>
                )}
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                <div className={`text-xs mt-1 flex items-center gap-1 ${
                  isMyMessage(message) ? 'text-blue-100' : 'text-gray-500'
                }`}>
                  {isMyMessage(message) ? (
                    <div className="flex items-center gap-1">
                      <span className="text-green-300">✓✓</span>
                      <span className="text-xs">Delivered</span>
                      <span className="ml-2">{formatMessageTime(message.created_at)}</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span>{formatMessageTime(message.created_at)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-8 text-gray-500">
            <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p className="text-sm">No messages yet</p>
            <p className="text-xs text-gray-400">Start the conversation!</p>
          </div>
        )}
        
        {/* Typing Indicator */}
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-lg px-4 py-2">
              <div className="flex items-center gap-1">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
                <span className="text-xs text-gray-500 ml-2">Someone is typing...</span>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="p-4 border-t border-gray-200 bg-gradient-to-r from-gray-50 to-blue-50">
        <form onSubmit={handleSendMessage} className="flex gap-3 items-center">
          {/* Attachment Options Dropdown */}
          <div className="relative">
            <button
              type="button"
              className="inline-flex items-center justify-center w-10 h-10 rounded-md border border-gray-300 bg-white hover:bg-gray-100"
              onClick={() => setShowAttachmentOptions(!showAttachmentOptions)}
              title="Attach file"
            >
              <Paperclip className="h-4 w-4 text-gray-600" />
            </button>
            
            {showAttachmentOptions && (
              <div className="absolute bottom-12 left-0 bg-white border border-gray-200 rounded-lg shadow-lg p-2 z-10">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-100 rounded"
                    onClick={() => handleFileSelect('image')}
                  >
                    <Image className="h-4 w-4 text-blue-600" />
                    Image
                  </button>
                  <button
                    type="button"
                    className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-100 rounded"
                    onClick={() => handleFileSelect('video')}
                  >
                    <Video className="h-4 w-4 text-purple-600" />
                    Video
                  </button>
                  <button
                    type="button"
                    className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-100 rounded"
                    onClick={() => handleFileSelect('pdf')}
                  >
                    <FileText className="h-4 w-4 text-red-600" />
                    PDF
                  </button>
                  <button
                    type="button"
                    className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-100 rounded"
                    onClick={() => handleFileSelect('audio')}
                  >
                    <Mic className="h-4 w-4 text-green-600" />
                    Audio
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Voice Recording Button */}
          <button
            type="button"
            className={`inline-flex items-center justify-center w-10 h-10 rounded-md border ${recording ? 'border-red-400 bg-red-50' : 'border-gray-300 bg-white'} hover:bg-gray-100`}
            onClick={async () => {
              try {
                if (!recording) {
                  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                  const recorder = new MediaRecorder(stream);
                  const chunks = [];
                  recorder.ondataavailable = (e) => chunks.push(e.data);
                  recorder.onstop = () => {
                    const blob = new Blob(chunks, { type: 'audio/webm' });
                    const file = new File([blob], `voice-message-${Date.now()}.webm`, { type: 'audio/webm' });
                    setAttachment(file);
                    stream.getTracks().forEach(t => t.stop());
                  };
                  mediaRecorderRef.current = recorder;
                  recorder.start();
                  setRecording(true);
                  toast.success('Recording started...');
                } else {
                  mediaRecorderRef.current?.stop();
                  setRecording(false);
                  toast.success('Recording stopped');
                }
              } catch (err) {
                toast.error('Microphone access denied');
              }
            }}
            title={recording ? 'Stop Recording' : 'Record Voice Message'}
          >
            <Mic className={`h-4 w-4 ${recording ? 'text-red-500' : 'text-gray-600'}`} />
          </button>

          <Input
            value={newMessage}
            onChange={handleTyping}
            placeholder="Type your message..."
            className="flex-1 rounded-full border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            disabled={sendMessageMutation.isLoading}
          />
          
          <Button
            type="submit"
            disabled={(!newMessage.trim() && !attachment) || sendMessageMutation.isLoading}
            loading={sendMessageMutation.isLoading}
            className="px-6 py-2 rounded-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg hover:shadow-xl transition-all duration-200"
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>

        {/* Attachment Preview */}
        {attachment && (
          <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm text-blue-700">
                {getAttachmentEmoji(attachment)} {getAttachmentType(attachment)}: {attachment.name}
              </span>
              <span className="text-xs text-blue-500">
                ({Math.round(attachment.size / 1024)} KB)
              </span>
            </div>
            <button
              type="button"
              onClick={() => setAttachment(null)}
              className="text-blue-500 hover:text-blue-700"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Recording Indicator */}
        {recording && (
          <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
            <span className="text-sm text-red-700">Recording... Click mic to stop</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectChat;
