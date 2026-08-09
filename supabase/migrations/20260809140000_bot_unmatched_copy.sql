-- Eşleşmeyen mesaj: asistan devri + ne yazılabileceği. Mevcut varsayılan metinleri günceller.

update public.bot_settings
set
  welcome_message = $welcome$Merhaba, mesajınız alındı. Asistanımız en kısa sürede dönüş yapacak.

Hızlı bilgi için yazabilirsiniz: fiyat, SGK, konum, randevu, bel fıtığı, MR.

Hello — your message was received. Our assistant will reply shortly.
Quick questions: price, insurance, location, appointment, hernia, MRI.

Uzaktan teşhis / remote diagnosis yok.$welcome$,
  after_hours_message = $after$Şu an mesai dışındayız. Mesajınız kaydedildi; ekibimiz mesai başında dönüş yapacak.

Şimdi yazabilirsiniz: fiyat, SGK, konum, randevu.

We're outside business hours. Your message is saved; we'll reply when we're back.$after$,
  fallback_message = $fallback$Bu soruyu asistanımız yanıtlayacak; mesajınız iletildi.

İsterseniz şimdi yazın: fiyat, SGK, konum, randevu, MR.

An assistant will reply shortly. You can also ask: price, insurance, location, appointment, MRI.
Uzaktan ameliyat kararı verilmez.$fallback$,
  updated_at = now()
where id = true
  and welcome_message in (
    'Merhaba, mesajınız alındı. Size yardımcı olabilmemiz için kısaca talebinizi yazabilirsiniz.'
  );
