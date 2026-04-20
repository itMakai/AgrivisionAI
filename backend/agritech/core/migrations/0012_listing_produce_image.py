from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0011_booking_listing'),
    ]

    operations = [
        migrations.AddField(
            model_name='listing',
            name='produce_image',
            field=models.ImageField(blank=True, null=True, upload_to='listing_images/'),
        ),
    ]
