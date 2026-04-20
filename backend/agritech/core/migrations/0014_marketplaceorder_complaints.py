from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0013_marketplaceorder'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AddField(
            model_name='marketplaceorder',
            name='complaint_filed_by',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='filed_order_complaints', to=settings.AUTH_USER_MODEL),
        ),
        migrations.AddField(
            model_name='marketplaceorder',
            name='complaint_resolved_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='marketplaceorder',
            name='complaint_resolved_by',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='resolved_order_complaints', to=settings.AUTH_USER_MODEL),
        ),
        migrations.AddField(
            model_name='marketplaceorder',
            name='complaint_resolution',
            field=models.TextField(blank=True),
        ),
        migrations.AddField(
            model_name='marketplaceorder',
            name='complaint_subject',
            field=models.CharField(blank=True, max_length=200),
        ),
    ]
