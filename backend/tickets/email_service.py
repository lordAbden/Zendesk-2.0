import logging
from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from django.utils.html import strip_tags
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import datetime, timedelta
import os
from .models import Ticket, TicketEvent, TicketClosureReport

User = get_user_model()
logger = logging.getLogger(__name__)

class EmailNotificationService:
    """Service pour gérer l'envoi d'emails de notification"""
    
    def __init__(self):
        self.enabled = getattr(settings, 'EMAIL_NOTIFICATIONS_ENABLED', True)
        self.admin_enabled = getattr(settings, 'ADMIN_EMAIL_NOTIFICATIONS_ENABLED', True)
    
    def send_email(self, subject, template_name, context, recipient_list, from_email=None, attachments=None):
        """Envoie un email avec template HTML"""
        if not self.enabled:
            logger.info(f"Email notifications disabled, skipping: {subject}")
            return False
        
        try:
            from_email = from_email or settings.DEFAULT_FROM_EMAIL
            
            # Rendre le template HTML
            html_content = render_to_string(f'emails/{template_name}', context)
            text_content = strip_tags(html_content)
            
            # Créer l'email
            email = EmailMultiAlternatives(
                subject=subject,
                body=text_content,
                from_email=from_email,
                to=recipient_list
            )
            email.attach_alternative(html_content, "text/html")
            
            # Ajouter les pièces jointes si nécessaire
            if attachments:
                for attachment in attachments:
                    email.attach(*attachment)
            
            # Envoyer l'email
            email.send()
            logger.info(f"Email sent successfully: {subject} to {recipient_list}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send email {subject}: {str(e)}")
            return False
    
    def get_admin_email(self):
        """Récupère l'email de l'administrateur"""
        try:
            admin = User.objects.filter(role='admin').first()
            return admin.email if admin else None
        except Exception as e:
            logger.error(f"Failed to get admin email: {str(e)}")
            return None
    
    def get_ticket_url(self, ticket):
        """Génère l'URL du ticket"""
        return f"{settings.FRONTEND_URL}/tickets/{ticket.id}" if hasattr(settings, 'FRONTEND_URL') else f"http://localhost:3000/tickets/{ticket.id}"
    
    def notify_ticket_created(self, ticket):
        """Notifie tous les techniciens quand un ticket est créé par un employé"""
        if ticket.requester.role != 'employee':
            return False
        
        # Récupérer tous les techniciens
        technicians = User.objects.filter(role='technician')
        if not technicians.exists():
            return False
        
        recipient_emails = [tech.email for tech in technicians]
        
        # Déterminer le sujet selon la priorité
        if ticket.priority in ['P1', 'P2']:
            subject = f"URGENT: Ticket Haute Priorité Créé - {ticket.short_id}"
        else:
            subject = f"Nouveau Ticket Créé - {ticket.short_id}"
        
        context = {
            'ticket': ticket,
            'ticket_url': self.get_ticket_url(ticket)
        }
        
        return self.send_email(
            subject=subject,
            template_name='ticket_created.html',
            context=context,
            recipient_list=recipient_emails
        )
    
    def notify_ticket_claimed(self, ticket, event):
        """Notifie l'employé quand son ticket est réclamé"""
        if not ticket.requester or ticket.requester.role != 'employee':
            return False
        
        subject = f"Votre Ticket a été Réclamé - {ticket.short_id}"
        
        context = {
            'ticket': ticket,
            'event': event,
            'ticket_url': self.get_ticket_url(ticket)
        }
        
        return self.send_email(
            subject=subject,
            template_name='ticket_claimed.html',
            context=context,
            recipient_list=[ticket.requester.email]
        )
    
    def notify_ticket_closed(self, ticket, event):
        """Notifie l'employé quand son ticket est fermé"""
        if not ticket.requester or ticket.requester.role != 'employee':
            return False
        
        # Récupérer le rapport de fermeture
        closure_report = None
        try:
            closure_report = TicketClosureReport.objects.filter(ticket=ticket).first()
        except:
            pass
        
        subject = f"Votre Ticket a été Fermé - {ticket.short_id}"
        
        context = {
            'ticket': ticket,
            'event': event,
            'closure_report': closure_report,
            'ticket_url': self.get_ticket_url(ticket)
        }
        
        return self.send_email(
            subject=subject,
            template_name='ticket_closed.html',
            context=context,
            recipient_list=[ticket.requester.email]
        )
    
    def notify_ticket_reopened(self, ticket, event):
        """Notifie l'employé quand son ticket est rouvert"""
        if not ticket.requester or ticket.requester.role != 'employee':
            return False
        
        subject = f"Votre Ticket a été Rouvert - {ticket.short_id}"
        
        context = {
            'ticket': ticket,
            'event': event,
            'ticket_url': self.get_ticket_url(ticket)
        }
        
        return self.send_email(
            subject=subject,
            template_name='ticket_reopened.html',
            context=context,
            recipient_list=[ticket.requester.email]
        )
    
    def notify_technician_added(self, ticket, event, technician):
        """Notifie un technicien quand il est ajouté à un ticket"""
        if not technician or technician.role != 'technician':
            return False
        
        # Déterminer le sujet selon la priorité
        if ticket.priority in ['P1', 'P2']:
            subject = f"URGENT: Ajouté à un Ticket Haute Priorité - {ticket.short_id}"
        else:
            subject = f"Ajouté à un Ticket - {ticket.short_id}"
        
        context = {
            'ticket': ticket,
            'event': event,
            'technician': technician,
            'ticket_url': self.get_ticket_url(ticket)
        }
        
        return self.send_email(
            subject=subject,
            template_name='technician_added.html',
            context=context,
            recipient_list=[technician.email]
        )
    
    def notify_admin_user_changed(self, user, changes):
        """Notifie l'admin quand un utilisateur modifie ses informations"""
        if not self.admin_enabled:
            return False
        
        admin_email = self.get_admin_email()
        if not admin_email:
            return False
        
        subject = f"Modification de Compte Utilisateur - {user.username}"
        
        context = {
            'user': user,
            'changes': changes,
            'changed_at': timezone.now()
        }
        
        return self.send_email(
            subject=subject,
            template_name='admin_user_changed.html',
            context=context,
            recipient_list=[admin_email]
        )
    
    def notify_admin_closure_report(self, ticket, closure_report):
        """Notifie l'admin avec le rapport de fermeture en pièce jointe"""
        if not self.admin_enabled:
            return False
        
        admin_email = self.get_admin_email()
        if not admin_email:
            return False
        
        subject = f"Rapport de Fermeture - {ticket.short_id}"
        
        context = {
            'ticket': ticket,
            'closure_report': closure_report
        }
        
        # Préparer la pièce jointe du rapport
        attachments = []
        if closure_report and closure_report.report_file:
            try:
                if os.path.exists(closure_report.report_file.path):
                    attachments.append((
                        f"rapport_fermeture_{ticket.short_id}.pdf",
                        closure_report.report_file.read(),
                        "application/pdf"
                    ))
            except Exception as e:
                logger.error(f"Failed to attach closure report: {str(e)}")
        
        return self.send_email(
            subject=subject,
            template_name='admin_closure_report.html',
            context=context,
            recipient_list=[admin_email],
            attachments=attachments
        )
    
    def send_monthly_report(self, stats_data, month_name, year):
        """Envoie le rapport mensuel à l'admin"""
        if not self.admin_enabled:
            return False
        
        admin_email = self.get_admin_email()
        if not admin_email:
            return False
        
        subject = f"Rapport Mensuel des Statistiques - {month_name} {year}"
        
        context = {
            'stats': stats_data,
            'month_name': month_name,
            'year': year
        }
        
        # Préparer les pièces jointes des captures d'écran
        attachments = []
        if 'screenshots' in stats_data:
            for screenshot_path in stats_data['screenshots']:
                try:
                    if os.path.exists(screenshot_path):
                        with open(screenshot_path, 'rb') as f:
                            attachments.append((
                                os.path.basename(screenshot_path),
                                f.read(),
                                "image/png"
                            ))
                except Exception as e:
                    logger.error(f"Failed to attach screenshot {screenshot_path}: {str(e)}")
        
        return self.send_email(
            subject=subject,
            template_name='admin_monthly_report.html',
            context=context,
            recipient_list=[admin_email],
            attachments=attachments
        )

# Instance globale du service
email_service = EmailNotificationService()

