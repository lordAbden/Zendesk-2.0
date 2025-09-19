import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model
from .models import Ticket, TicketMessage

User = get_user_model()


class TicketChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.ticket_id = self.scope['url_route']['kwargs']['ticket_id']
        self.room_group_name = f'ticket_{self.ticket_id}'
        
        # Join room group
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        
        await self.accept()
    
    async def disconnect(self, close_code):
        # Leave room group
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )
    
    async def receive(self, text_data):
        text_data_json = json.loads(text_data)
        message_type = text_data_json.get('type', 'message')
        
        if message_type == 'message':
            message_text = text_data_json['message']
            user_id = text_data_json['user_id']
            
            # Save message to database
            await self.save_message(message_text, user_id)
            
            # Send message to room group
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'chat_message',
                    'message': message_text,
                    'user_id': user_id,
                    'timestamp': text_data_json.get('timestamp')
                }
            )
    
    async def chat_message(self, event):
        # Send message to WebSocket
        await self.send(text_data=json.dumps({
            'type': 'chat_message',
            'message': event['message'],
            'user_id': event['user_id'],
            'timestamp': event['timestamp']
        }))
    
    @database_sync_to_async
    def save_message(self, message_text, user_id):
        try:
            user = User.objects.get(id=user_id)
            ticket = Ticket.objects.get(id=self.ticket_id)
            
            # Check if user has access to this ticket
            if user.is_technician or ticket.requester == user:
                TicketMessage.objects.create(
                    ticket=ticket,
                    sender=user,
                    message_text=message_text
                )
        except (User.DoesNotExist, Ticket.DoesNotExist):
            pass 