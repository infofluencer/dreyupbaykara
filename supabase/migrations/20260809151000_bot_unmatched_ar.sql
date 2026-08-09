-- Karşılama / fallback / mesai dışı: Arapça satır ekle.

update public.bot_settings
set
  welcome_message = $welcome$Merhaba, mesajınız alındı. Asistanımız en kısa sürede dönüş yapacak.

Hızlı bilgi için yazabilirsiniz: fiyat, SGK, konum, randevu, bel fıtığı, MR.

Hello — your message was received. Our assistant will reply shortly.
Quick questions: price, insurance, location, appointment, hernia, MRI.

مرحباً، تم استلام رسالتكم. سيرد المساعد قريباً.
أسئلة سريعة: السعر، التأمين، الموقع، الموعد، الرنين.

Uzaktan teşhis / remote diagnosis / لا تشخيص عن بُعد.$welcome$,
  after_hours_message = $after$Şu an mesai dışındayız. Mesajınız kaydedildi; ekibimiz mesai başında dönüş yapacak.

Şimdi yazabilirsiniz: fiyat, SGK, konum, randevu.

We're outside business hours. Your message is saved; we'll reply when we're back.

نحن خارج أوقات الدوام. تم حفظ رسالتكم؛ نرد عند العودة.$after$,
  fallback_message = $fallback$Bu soruyu asistanımız yanıtlayacak; mesajınız iletildi.

İsterseniz şimdi yazın: fiyat, SGK, konum, randevu, MR.

An assistant will reply shortly. You can also ask: price, insurance, location, appointment, MRI.

سيجيب المساعد على هذا السؤال؛ تم إرسال رسالتكم.
يمكنكم الكتابة الآن: السعر / التأمين / الموقع / الموعد / الرنين.

Uzaktan ameliyat kararı verilmez.$fallback$,
  updated_at = now()
where id = true;
