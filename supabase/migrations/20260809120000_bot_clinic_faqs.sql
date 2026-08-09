-- Klinik SSS (kural tabanlı WhatsApp bot). Safe to re-run.

insert into public.bot_faqs (question, keywords, answer, enabled, sort_order)
select q.question, q.keywords, q.answer, true, q.sort_order
from (
  values
    (
      'Bel fıtığı / endoskopik ameliyat yapıyor musunuz?',
      array['bel fıtığı','bel fitigi','endoskopik','fıtık ameliyatı','fitik ameliyati','disk hernisi','hernia','endoscopic'],
      'Evet. Op. Dr. Eyüp Baykara bel fıtığında full endoskopik cerrahi uygular. Ameliyat gerekip gerekmediği muayene ile netleşir; uzaktan yalnızca MR ile karar verilmez.',
      5
    ),
    (
      'Klinik nerede? Muayenehane var mı?',
      array['nerede','nerde','konum','adres','muayenehane','klinik','silivri','anadolu','yeriniz','hangi hastane','hospital','clinic'],
      'Op. Dr. Eyüp Baykara, İstanbul Silivri Özel Anadolu Hastanesi''nde çalışmaktadır. Ayrı bir muayenehanesi yoktur. Randevu ve muayene hastane üzerinden planlanır.',
      10
    ),
    (
      'Randevu nasıl alınır?',
      array['randevu','muayene randevu','nasıl gelirim','nasil gelirim','appointment'],
      'Randevu için adınızı, telefonunuzu ve uygun günü yazın; asistanımız dönüş yapacaktır. Muayene İstanbul Silivri Özel Anadolu Hastanesi''ndedir.',
      15
    ),
    (
      'Ücret / fiyat ne kadar?',
      array['fiyat','ücret','ucret','ücreti','ucreti','kaç tl','kac tl','maliyet','fiyati','fiyatı','price','cost'],
      'Ameliyat ücretleri 200.000 TL''den başlamaktadır. Kesin tutar, muayene ve sizin durumunuza göre netleşir. Uzaktan yalnızca kabaca fiyat bilgisi verilebilir; kesin plan muayenede yapılır.',
      20
    ),
    (
      'İyileşme süresi ne kadar?',
      array['iyileş','iyiles','iyileşme','iyilesme','ne kadar sürede','ne kadar surede','toparlanma'],
      'İyileşme süresi, şikayetin ne kadar beklediğinize ve sinir hasarının derecesine göre değişir. Kesin süre uzaktan söylenemez.',
      22
    ),
    (
      'Boyun fıtığında da bu ameliyat yapılır mı?',
      array['boyun','boyun fıtığı','boyun fitigi','servikal'],
      'Evet. Full endoskopik teknik boyun fıtıklarında da uygulanabilir.',
      30
    ),
    (
      'SGK anlaşması var mı?',
      array['sgk','sigorta','anlaşma','anlasma','bağkur','bagkur','emekli sandığı','devlet sigorta'],
      'Evet, SGK anlaşmamız vardır.',
      40
    ),
    (
      'Sadece ameliyat mı, ameliyatsız tedavi de var mı?',
      array['ameliyatsız','ameliyatsiz','iğne','igne','fizik tedavi','sadece ameliyat','cerrahi değil','cerrahi degil','konservatif'],
      'Sosyal medyada gördüğünüz full endoskopik yöntem, cerrahi gereken olgular içindir. Ameliyat düzeyinde değilse Dr. Eyüp muayenede ameliyatsız tedavi planı yapar. Karar uzaktan, yalnızca MR ile verilmez.',
      50
    ),
    (
      'Operatör mü, profesör mü? Branşı nedir?',
      array['operatör','profesör','profesor','unvan','ünvan','branş','brans','uzmanlık','uzmanlik','beyin cerrah','ne doktoru'],
      'Op. Dr. Eyüp Baykara, Beyin, Sinir ve Omurga Cerrahisi uzmanıdır (Operatör Doktor). Profesör unvanı yoktur.',
      60
    ),
    (
      'Kanal darlığında bu ameliyat yapılır mı?',
      array['kanal darlığı','kanal darligi','stenoz'],
      'Kanal darlığı muayene ile değerlendirilir. Uygun olgularda endoskopik teknik kullanılabilir; karar muayenede verilir.',
      65
    ),
    (
      'Bel kaymasında bu ameliyat yapılır mı?',
      array['bel kayması','bel kaymasi','kayma','spondilolistez','listezis'],
      'Fıtık veya kanal darlığına ek kayma varsa kaymanın ayrıca değerlendirilmesi gerekir. Sorun yalnızca bel kayması ise bu teknik uygulanmaz. Net karar muayene + görüntüleme ile verilir.',
      70
    ),
    (
      'Sonuç garantisi / başarı oranı?',
      array['garanti','başarı','basari','yüzde','yuzde','kesin çözüm','kesin cozum'],
      'Teknik olarak fıtık parçası ve kireçlenme temizlenir. İyileşme süresi, ne kadar beklendiğinize ve sinir hasarının derecesine göre değişir. Tıbbi sonuç için garanti verilmez.',
      80
    ),
    (
      'Ücretsiz MR bakıyor musunuz? MR göndereyim mi?',
      array['mr','mri','emar','ücretsiz mr','ucretsiz mr','mr bak','mr gönder','mr gonder','uzaktan mr','mr yorum','mr değerlendir'],
      'Uzaktan ücretsiz MR değerlendirmesi yapılmaz. Yalnızca MR''a bakarak ameliyat kararı verilmez; muayene şarttır. Uzaktan teşhis veya tedavi planı sunulmaz. Şehir dışındaysanız önce kısa bilgi paylaşın; fiyat aralığı hakkında bilgi verilebilir, karar yine muayenede netleşir.',
      90
    ),
    (
      'Do you perform endoscopic hernia surgery?',
      array['disc hernia','herniated disc','slipped disc','endoscopic','lumbar hernia'],
      'Yes. Op. Dr. Eyüp Baykara performs full endoscopic surgery for lumbar disc herniation. Whether you need surgery is decided at examination; we do not decide from an MRI alone.',
      105
    ),
    (
      'Where is the clinic? Is there a private office?',
      array['where is','where are you','located','location','address','hospital','clinic','private office','private practice'],
      'Op. Dr. Eyüp Baykara works at İstanbul Silivri Özel Anadolu Hastanesi. He does not have a private clinic or office. Appointments and examinations are arranged through the hospital.',
      110
    ),
    (
      'How do I book an appointment?',
      array['appointment','book a visit','how to come'],
      'Send your name, phone and a preferred day; our assistant will get back to you. Examinations are at İstanbul Silivri Özel Anadolu Hastanesi.',
      115
    ),
    (
      'How much does it cost?',
      array['price','cost','fee','how much','expensive','pricing'],
      'Surgery fees start from 200,000 TL. The final amount depends on your condition and examination. We can share an approximate price remotely; the exact plan is confirmed in person.',
      120
    ),
    (
      'How long is recovery?',
      array['recovery','how long to heal','healing time'],
      'Recovery time depends on how long you have had symptoms and the extent of nerve damage. We cannot give an exact remote timeline.',
      125
    ),
    (
      'Can this surgery be done for neck hernias?',
      array['neck hernia','cervical','neck disc','neck surgery'],
      'Yes. The full endoscopic technique can also be used for neck hernias.',
      130
    ),
    (
      'Do you have an insurance / SGK agreement?',
      array['insurance','social security','health insurance'],
      'Yes, we have an SGK (Turkish social security) agreement.',
      140
    ),
    (
      'Is it only surgery, or are there non-surgical treatments?',
      array['non surgical','nonsurgical','without surgery','injection','physical therapy','only surgery','conservative'],
      'The full endoscopic technique you see on social media is for cases that need surgery. If your condition is not at a surgical level, Dr. Eyüp will plan non-surgical treatment during the physical examination. This decision is not made remotely from an MRI alone.',
      150
    ),
    (
      'Is the doctor an operator or a professor? What is his specialty?',
      array['operator','professor','specialty','speciality','neurosurgeon','what doctor','spine surgeon'],
      'Op. Dr. Eyüp Baykara is a specialist in Brain, Nerve and Spinal Surgery (Operator Doctor). He does not hold a professor title.',
      160
    ),
    (
      'Is this surgery performed for spondylolisthesis / slipping?',
      array['spondylolisthesis','slipping','slippage','vertebral slip','listhesis'],
      'If there is slipping in addition to a hernia or spinal canal narrowing, the slipping needs a detailed evaluation. If the only problem is slipping, this technique is not used. The final decision is made with examination and imaging.',
      170
    ),
    (
      'Is this surgery performed for spinal stenosis?',
      array['stenosis','spinal stenosis','canal narrowing'],
      'Spinal stenosis is evaluated in person. Endoscopic technique may be used in suitable cases; the decision is made at examination.',
      175
    ),
    (
      'Do you guarantee the result / success rate?',
      array['guarantee','guaranteed','success rate','success','100 percent'],
      'The technique removes the hernia fragments and calcification. Recovery time depends on how long you have waited for treatment and the extent of nerve damage. We do not give a medical guarantee of the outcome.',
      180
    ),
    (
      'Do you provide a free MRI evaluation? Can we send our MRI?',
      array['mri','free mri','mri review','send mri','remote mri','evaluate mri','mri evaluation'],
      'We do not offer free remote MRI evaluations. A surgical decision cannot be made from an MRI alone; a physical examination is required. We do not diagnose or plan treatment remotely. If you are coming from out of town, share some basic information first and we can give an approximate price; the plan is still confirmed in person.',
      190
    )
) as q(question, keywords, answer, sort_order)
where not exists (
  select 1 from public.bot_faqs existing where existing.question = q.question
);
