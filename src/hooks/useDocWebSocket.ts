// hooks/useDocWebSocket.ts
import { useEffect, useRef } from 'react';
import { Client, type Message } from '@stomp/stompjs';
import { type PDFDocument } from '../types/PDFDocument';

export const useDocWebSocket = (
    onFileUpdate: (file: PDFDocument) => void
) => {
  const clientRef = useRef<Client | null>(null);

  useEffect(() => {
    console.log('🔌 Connecting to WebSocket at ws://localhost:7777/ws');
    
    const client = new Client({
      brokerURL: 'ws://localhost:7777/ws',
      
      onConnect: (frame) => {
        console.log('✅ WebSocket Connected!', frame);
        
        client.subscribe('/topic/doc-updates', (message: Message) => {
          console.log('📨 Received message:', message.body);
          
          try {
            const updatedFile: PDFDocument = JSON.parse(message.body);
            console.log('📄 Document update:', updatedFile);
            console.log('Available for signing:', updatedFile.availableForSigning);
            onFileUpdate(updatedFile);
          } catch (error) {
            console.error('❌ Parse error:', error);
          }
        });
        
        console.log('✅ Subscribed to /topic/doc-updates');
      },
      
      onDisconnect: (frame) => {
        console.log('❌ Disconnected', frame);
      },
      
      onStompError: (frame) => {
        console.error('❌ STOMP Error:', frame.headers['message']);
        console.error('Frame:', frame.body);
      },
      
      onWebSocketError: (error) => {
        console.error('❌ WebSocket Error:', error);
      },
      
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
      
      debug: (str) => {
        console.log('🐛 STOMP:', str);
      }
    });

    client.activate();
    clientRef.current = client;

    return () => {
      console.log('🧹 Cleaning up WebSocket...');
      if (client.connected) {
        client.deactivate();
      }
    };
  }, [onFileUpdate]);

  return clientRef.current;
};