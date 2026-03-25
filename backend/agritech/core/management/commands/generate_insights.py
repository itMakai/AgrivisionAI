from django.core.management.base import BaseCommand
from django.utils import timezone
from core.models import FarmerInsight, FarmerProfile, BuyerProfile, StorageAdvice, PriceForecast, WeatherForecast
from django.contrib.auth import get_user_model

User = get_user_model()


class Command(BaseCommand):
    help = 'Generate rule-based farmer insights daily'

    def handle(self, *args, **options):
        today = timezone.now().date()
        self.stdout.write('Generating farmer insights for %s' % today)

        users = User.objects.filter(is_active=True)
        for u in users:
            # only generate for users that have a farmer profile
            try:
                fp = FarmerProfile.objects.get(user=u)
            except FarmerProfile.DoesNotExist:
                continue

            # simple rule: if recent weather indicates rainfall > 0, advise on harvest/storage
            wf = WeatherForecast.objects.filter(date=today).order_by('-date').first()
            if wf and getattr(wf, 'rainfall_mm', 0) and wf.rainfall_mm > 0:
                title = 'Rain expected today — harvest/storage note'
                content = f'Rainfall {wf.rainfall_mm}mm expected; consider moving harvested crops to covered storage. Humidity {wf.humidity}%.'
                FarmerInsight.objects.create(user=u, title=title, content=content, severity='medium', source='weather')

            # top market price notice (if any price forecasts exist today)
            pf_top = PriceForecast.objects.filter(date__lte=today).order_by('-predicted_price').first()
            if pf_top:
                title = f'Top market price: {pf_top.crop.name}'
                content = f"Top price nearby: {pf_top.crop.name} at {pf_top.market.name} — KSh {pf_top.predicted_price} (predicted)."
                FarmerInsight.objects.create(user=u, title=title, content=content, severity='low', source='price')

        self.stdout.write(self.style.SUCCESS('Insights generation complete'))
