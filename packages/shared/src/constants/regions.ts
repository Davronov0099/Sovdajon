export const UZ_REGIONS: Record<string, string[]> = {
  "Toshkent shahri": ["Bektemir", "Chilonzor", "Mirobod", "Mirzo Ulug'bek", "Olmazor", "Sergeli", "Shayxontohur", "Uchtepa", "Yakkasaroy", "Yunusobod", "Yashnaobod"],
  "Toshkent viloyati": ["Angren", "Olmaliq", "Chirchiq", "Bekobod", "Nurafshon", "Ohangaron", "Yangiyo'l", "Bo'ka", "Bo'stonliq", "Chinoz", "Qibray", "Oqqo'rg'on", "Ohangaron tumani", "Parkent", "Piskent", "Quyi Chirchiq", "O'rta Chirchiq", "Yangiyo'l tumani", "Yuqori Chirchiq", "Zangiota"],
  "Andijon viloyati": ["Andijon", "Xonobod", "Asaka", "Baliqchi", "Bo'z", "Buloqboshi", "Izboskan", "Jalaquduq", "Marhamat", "Mindivol", "Oltinko'l", "Paxtaobod", "Qo'rg'ontepa", "Shahrixon", "Ulug'nor", "Xo'jaobod"],
  "Buxoro viloyati": ["Buxoro", "Kogon", "G'ijduvon", "Jondor", "Kogon tumani", "Olot", "Peshku", "Qorako'l", "Qorovulbozor", "Romitan", "Shofirkon", "Vobkent"],
  "Farg'ona viloyati": ["Farg'ona", "Marg'ilon", "Quvasoy", "Qo'qon", "Rishton", "Beshariq", "Bog'dod", "Buvayda", "Dang'ara", "Furqat", "O'zbekiston", "Quva", "Sox", "Toshloq", "Uchko'prik", "Yozyovon"],
  "Jizzax viloyati": ["Jizzax", "Arnasoy", "Baxmal", "Do'stlik", "Forish", "G'allaorol", "Mirzacho'l", "Paxtakor", "Yangiobod", "Zafarobod", "Zarbdor", "Zomin"],
  "Xorazm viloyati": ["Urganch", "Xiva", "Bog'ot", "Gurlan", "Hazorasp", "Qo'shko'pir", "Shovot", "Tuproqqal'a", "Urganch tumani", "Yangiariq", "Yangibozor"],
  "Namangan viloyati": ["Namangan", "Chortoq", "Chust", "Kosonsoy", "Mingbuloq", "Namangan tumani", "Norin", "Pop", "To'raqo'rg'on", "Uchqo'rg'on", "Uychi", "Yangiqo'rg'on"],
  "Navoiy viloyati": ["Navoiy", "Zarafshon", "Konimex", "Karmana", "Navbahor", "Nurota", "Qiziltepa", "Tomdi", "Uchquduq", "Xatirchi"],
  "Qashqadaryo viloyati": ["Qarshi", "Shahrisabz", "G'uzor", "Dehqonobod", "Kasbi", "Kitob", "Koson", "Mirishkor", "Muborak", "Nishon", "Chiroqchi", "Yakkabog'", "Qamashi"],
  "Samarqand viloyati": ["Samarqand", "Kattaqo'rg'on", "Bulung'ur", "Ishtixon", "Jomboy", "Loyish", "Narpay", "Nurobod", "Oqdaryo", "Pastdarg'om", "Paxtachi", "Payariq", "Qo'shrabot", "Samarqand tumani", "Toyloq", "Urgut"],
  "Surxondaryo viloyati": ["Termiz", "Angor", "Bandixon", "Boysun", "Denov", "Jarqo'rg'on", "Muzrabod", "Oltinsoy", "Qiziriq", "Qumqo'rg'on", "Sariosiyo", "Sherobod", "Sho'rchi", "Termiz tumani", "Uzun"],
  "Sirdaryo viloyati": ["Guliston", "Sirdaryo", "Boyovut", "Guliston tumani", "Mirzaobod", "Oqoltin", "Sardoba", "Sayxunobod", "Xovos"],
  "Qoraqalpog'iston": ["Nukus", "Mo'ynoq", "Amudaryo", "Beruniy", "Chimboy", "Ellikqal'a", "Kegeyli", "Nukus tumani", "Qanliko'l", "Qo'ng'irot", "Qorao'zak", "Shumanay", "Taxtako'pir", "To'rtko'l", "Xo'jayli"],
};

export const UZ_VILOYATLAR = Object.keys(UZ_REGIONS);

export function getTumanlar(viloyat: string): string[] {
  return UZ_REGIONS[viloyat] ?? [];
}
