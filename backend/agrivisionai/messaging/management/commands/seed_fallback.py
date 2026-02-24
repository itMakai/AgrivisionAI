from django.core.management.base import BaseCommand
from django.utils import timezone
from core.models import WeatherForecast, StorageAdvice


class Command(BaseCommand):
    help = 'Seed fallback weather and storage advice used when no live data is available.'

    def handle(self, *args, **options):
        today = timezone.now().date()
        wf, created = WeatherForecast.objects.get_or_create(
            date=today,
            defaults={
                'rainfall_mm': 0.0,
                'temp_min': 20.0,
                'temp_max': 30.0,
                'humidity': 60,
            }
        )
        if created:
            self.stdout.write(self.style.SUCCESS(f'Created fallback WeatherForecast for {today}'))
        else:
            self.stdout.write(f'WeatherForecast for {today} already exists')

        # Seed some storage advice tips if none exist
        tips = [
            ('Keep produce dry', 'Store produce in a cool, dry, and ventilated place to reduce spoilage.', 2),
            ('Sort and grade', 'Sort produce by quality and size before storage or sale to get better prices.', 1),
            ('Use clean containers', 'Keep storage containers clean and off the ground to prevent pest infestations.', 1),
        ]

        for title, content, severity in tips:
            obj, created = StorageAdvice.objects.get_or_create(
                title=title,
                defaults={'content': content, 'severity': severity}
            )
            if created:
                self.stdout.write(self.style.SUCCESS(f'Added StorageAdvice: {title}'))
            else:
                self.stdout.write(f'StorageAdvice already exists: {title}')

        self.stdout.write(self.style.SUCCESS('Seeding fallback complete'))
