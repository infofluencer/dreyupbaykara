-- SSS cevapları: MR koşullu istisna, garanti %100 teknik temizleme, branş omurilik.
-- question metnine göre günceller (idempotent).

-- ── TR ─────────────────────────────────────────────────────────────────────
update public.bot_faqs
set
  answer = $a$Uzaktan ücretsiz MR değerlendirme hizmetimiz yoktur; “MR atsak bakar mısınız?” taleplerine bu hizmeti sunmuyoruz. Yalnızca MR’a bakarak ameliyat kararı, teşhis veya tedavi planı verilmez — Dr. Eyüp’ün muayenesi gerekir.

Şehir dışındaysanız önce kısa bilgi paylaşın. Net fiyat istiyorsanız veya uygunsa gelmek için soruyorsanız, MR görüntülerinize bakıp net bilgi verebiliriz. Ameliyatlık olup olmadığınız yine uzaktan yalnızca MR ile kararlaştırılmaz; muayene şarttır.$a$,
  updated_at = now()
where question = 'Ücretsiz MR bakıyor musunuz? MR göndereyim mi?';

update public.bot_faqs
set
  answer = $a$Yaptığımız teknikte sinire basan fıtık parçası ve kanalı daraltan kireçlenmeler %100 temizlenir. İyileşme oranı ve süresi, ne kadar beklendiğinize ve sinirin ne kadar hasar aldığına göre her hastada değişir. Tıbbi sonuç için garanti verilmez.$a$,
  updated_at = now()
where question = 'Sonuç garantisi / başarı oranı?';

update public.bot_faqs
set
  answer = $a$Op. Dr. Eyüp Baykara, Beyin, Sinir ve Omurilik Cerrahisi uzmanıdır (Operatör Doktor). Profesör unvanı yoktur.$a$,
  updated_at = now()
where question = 'Operatör mü, profesör mü? Branşı nedir?';

-- ── EN ─────────────────────────────────────────────────────────────────────
update public.bot_faqs
set
  answer = $a$We do not offer a free remote MRI evaluation for “can you look at my MRI?” requests. A surgical decision, diagnosis, or treatment plan is not made from an MRI alone — an in-person exam with Dr. Eyüp is required.

If you are out of town, share basic information first. When you need a clear price quote or want to know whether it is worth coming, we can review your MRI images and give concrete information. Whether surgery is indicated still cannot be decided from MRI alone remotely; examination is required.$a$,
  updated_at = now()
where question = 'Do you provide a free MRI evaluation? Can we send our MRI?';

update public.bot_faqs
set
  answer = $a$With our technique, the hernia fragment pressing on the nerve and the calcifications narrowing the canal are completely (100%) cleared. Recovery rate and time vary by how long you have waited and the extent of nerve damage. We do not give a medical guarantee of the outcome.$a$,
  updated_at = now()
where question = 'Do you guarantee the result / success rate?';

update public.bot_faqs
set
  answer = $a$Op. Dr. Eyüp Baykara is a specialist in Brain, Nerve and Spinal Cord Surgery (Operator Doctor). He does not hold a professor title.$a$,
  updated_at = now()
where question = 'Is the doctor an operator or a professor? What is his specialty?';

-- ── AR ─────────────────────────────────────────────────────────────────────
update public.bot_faqs
set
  answer = $a$لا نقدّم تقييماً مجانياً للرنين عن بُعد لطلبات مثل «هل تنظرون إلى الرنين؟». لا يُتخذ قرار جراحة أو تشخيص أو خطة علاج من الرنين وحده — يلزم فحص سريري مع Dr. Eyüp.

إن كنتم من خارج المدينة، شاركوا أولاً معلومات أساسية. إذا طلبتم سعراً واضحاً أو أردتم معرفة ما إذا كان المجيء مناسباً، يمكننا مراجعة صور الرنين وإعطاء معلومات دقيقة. قرار كون الحالة جراحية لا يزال لا يُتخذ عن بُعد من الرنين وحده؛ الفحص ضروري.$a$,
  updated_at = now()
where question = 'هل تقيّمون الرنين مجاناً؟ هل نرسل الرنين؟';

update public.bot_faqs
set
  answer = $a$في تقنيتنا تُزال قطعة الفتق الضاغطة على العصب والتكلسات المضيّقة للقناة بنسبة 100٪. نسبة ومدة التعافي تختلف حسب مدة الانتظار ودرجة تأثر العصب لكل مريض. لا نقدم ضماناً طبياً للنتيجة.$a$,
  updated_at = now()
where question = 'هل تضمنون النتيجة / نسبة النجاح؟';

update public.bot_faqs
set
  answer = $a$Op. Dr. Eyüp Baykara أخصائي جراحة الدماغ والأعصاب والنخاع الشوكي (طبيب جراح / Operatör). لا يحمل لقب بروفيسور.$a$,
  updated_at = now()
where question = 'هل الطبيب أخصائي أم بروفيسور؟ ما تخصصه؟';
