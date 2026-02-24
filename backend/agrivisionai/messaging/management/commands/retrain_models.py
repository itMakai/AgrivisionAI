from django.core.management.base import BaseCommand
import logging
from pathlib import Path
import csv

from core.models import Message

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Retrain ML models weekly using collected farmer feedback'

    def handle(self, *args, **options):
        logger.info('Starting retraining job')
        # Collect message->response pairs as simple training data
        qs = Message.objects.filter(inbound=True).exclude(response__isnull=True).exclude(response__exact='')
        out_dir = Path('data')
        out_dir.mkdir(parents=True, exist_ok=True)
        out_file = out_dir / 'feedback_pairs.csv'
        with out_file.open('w', newline='', encoding='utf-8') as fh:
            writer = csv.writer(fh)
            writer.writerow(['message', 'response', 'created_at'])
            for m in qs.order_by('-created_at'):
                writer.writerow([m.body.replace('\n', ' '), m.response.replace('\n', ' '), m.created_at.isoformat()])

        logger.info('Wrote %d feedback rows to %s', qs.count(), out_file)

        # Placeholder: call out to a training script or pipeline here. If you have a local script
        # scripts/train_models.py you can execute it from here or import it as a module.
        # For now we only prepare the feedback CSV which can be used by your training pipeline.

        self.stdout.write(self.style.SUCCESS(f'Retraining data exported to {out_file} ({qs.count()} rows)'))
