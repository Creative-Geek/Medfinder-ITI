// Supabase project constants
angular.module("medfinderApp").constant("SUPABASE", {
  URL: "https://jwyylcesbwextxdmquuh.supabase.co",
  KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp3eXlsY2VzYndleHR4ZG1xdXVoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4MjMzMTMsImV4cCI6MjA4ODM5OTMxM30.U8P5lN5MPbPFfYq82Vw5fFqySyTRPNsd1UgAcFyyHO8",
  AUTH_URL: "https://jwyylcesbwextxdmquuh.supabase.co/auth/v1",
  REST_URL: "https://jwyylcesbwextxdmquuh.supabase.co/rest/v1",
  STORAGE_URL: "https://jwyylcesbwextxdmquuh.supabase.co/storage/v1",
});

// Storefront sidebar category tree
angular.module("medfinderApp").constant("SHOP_CATEGORY_TREE", [
  {
    type: "الأدوية",
    label: "الأدوية",
    categories: [
      { name: "الفيتامينات و المكملات الغذائية", count: 10 },
      { name: "الحموضة وسوء الهضم", count: 8 },
      { name: "الكحة", count: 7 },
      { name: "بديل للسكر", count: 7 },
      { name: "مسكنات", count: 6 },
      { name: "مضادات حيوية", count: 6 },
      { name: "المغص", count: 5 },
      { name: "امساك", count: 5 },
      { name: "البرد و السعال", count: 3 },
      { name: "مضادات حيوية موضعية", count: 3 },
      { name: "الحروق البسيطة", count: 1 },
    ],
  },
  {
    type: "الحماية من الفيروسات",
    label: "الحماية من الفيروسات",
    categories: [{ name: "تقوية المناعة", count: 5 }],
  },
  {
    type: "منتجات المرأة",
    label: "منتجات المرأة",
    categories: [
      { name: "فوط صحية", count: 4 },
      { name: "إزالة الشعر", count: 4 },
      { name: "مزيل العرق للسيدات", count: 4 },
      { name: "صحة المرأة", count: 1 },
    ],
  },
  {
    type: "الأم و الطفل",
    label: "الأم و الطفل",
    categories: [
      { name: "الحفاضات و الكريمات", count: 4 },
      { name: "لبن الاطفال", count: 4 },
      { name: "العناية بالأم", count: 3 },
    ],
  },
  {
    type: "العناية بالبشرة و الشعر",
    label: "العناية بالبشرة و الشعر",
    categories: [
      { name: "الحماية من الشمس", count: 8 },
      { name: "العناية باليد و القدم", count: 6 },
      { name: "غسول الوجه", count: 6 },
      { name: "بلسم الشعر", count: 5 },
      { name: "شامبو", count: 4 },
      { name: "ماسكات الوجه", count: 3 },
      { name: "تفتيح البشرة", count: 3 },
      { name: "مزيل المكياج", count: 3 },
    ],
  },
  {
    type: "العناية بالاسنان",
    label: "العناية بالاسنان",
    categories: [
      { name: "عناية الفم", count: 8 },
      { name: "معجون الأسنان", count: 4 },
      { name: "العناية بالفم", count: 4 },
      { name: "فرشاة الأسنان", count: 4 },
    ],
  },
  {
    type: "منتجات الرجال",
    label: "منتجات الرجال",
    categories: [
      { name: "مزيل العرق للرجال", count: 4 },
      { name: "جل الحلاقة", count: 4 },
      { name: "مستلزمات الحلاقة", count: 3 },
    ],
  },
]);
