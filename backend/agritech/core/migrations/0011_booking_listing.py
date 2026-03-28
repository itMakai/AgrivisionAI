from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0010_serviceprovider_user'),
    ]

    operations = [
        migrations.AddField(
            model_name='booking',
            name='listing',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='transport_bookings', to='core.listing'),
        ),
    ]
