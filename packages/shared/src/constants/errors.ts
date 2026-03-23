export const ERROR_CODES = {
  // Auth
  AUTH_INVALID_CREDENTIALS: 'AUTH_INVALID_CREDENTIALS',
  AUTH_TOKEN_EXPIRED: 'AUTH_TOKEN_EXPIRED',
  AUTH_TOKEN_INVALID: 'AUTH_TOKEN_INVALID',
  AUTH_TOKEN_MISSING: 'AUTH_TOKEN_MISSING',
  AUTH_REFRESH_TOKEN_INVALID: 'AUTH_REFRESH_TOKEN_INVALID',
  AUTH_REFRESH_TOKEN_REUSED: 'AUTH_REFRESH_TOKEN_REUSED',
  AUTH_USER_INACTIVE: 'AUTH_USER_INACTIVE',
  AUTH_USER_DELETED: 'AUTH_USER_DELETED',
  AUTH_FORBIDDEN: 'AUTH_FORBIDDEN',

  // Validation
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  VALIDATION_PHONE_INVALID: 'VALIDATION_PHONE_INVALID',
  VALIDATION_PASSWORD_WEAK: 'VALIDATION_PASSWORD_WEAK',

  // Product
  PRODUCT_NOT_FOUND: 'PRODUCT_NOT_FOUND',
  PRODUCT_DELETED: 'PRODUCT_DELETED',

  // Category
  CATEGORY_NOT_FOUND: 'CATEGORY_NOT_FOUND',
  CATEGORY_HAS_PRODUCTS: 'CATEGORY_HAS_PRODUCTS',

  // Receipt
  RECEIPT_NOT_FOUND: 'RECEIPT_NOT_FOUND',
  RECEIPT_EMPTY_CART: 'RECEIPT_EMPTY_CART',
  RECEIPT_INVALID_PAYMENT: 'RECEIPT_INVALID_PAYMENT',
  RECEIPT_MIXED_SUM_MISMATCH: 'RECEIPT_MIXED_SUM_MISMATCH',
  RECEIPT_DEBT_NO_CUSTOMER: 'RECEIPT_DEBT_NO_CUSTOMER',

  // Return
  RETURN_PERIOD_EXPIRED: 'RETURN_PERIOD_EXPIRED',
  RETURN_QUANTITY_EXCEEDED: 'RETURN_QUANTITY_EXCEEDED',
  RETURN_ALREADY_RETURNED: 'RETURN_ALREADY_RETURNED',

  // Debt
  DEBT_NOT_FOUND: 'DEBT_NOT_FOUND',
  DEBT_ALREADY_PAID: 'DEBT_ALREADY_PAID',
  DEBT_LIMIT_EXCEEDED: 'DEBT_LIMIT_EXCEEDED',
  DEBT_OVERPAYMENT: 'DEBT_OVERPAYMENT',

  // Customer
  CUSTOMER_NOT_FOUND: 'CUSTOMER_NOT_FOUND',
  CUSTOMER_HAS_ACTIVE_DEBTS: 'CUSTOMER_HAS_ACTIVE_DEBTS',
  CUSTOMER_PHONE_EXISTS: 'CUSTOMER_PHONE_EXISTS',

  // Supplier
  SUPPLIER_NOT_FOUND: 'SUPPLIER_NOT_FOUND',

  // Salary
  SALARY_ALREADY_CALCULATED: 'SALARY_ALREADY_CALCULATED',
  SALARY_ALREADY_PAID: 'SALARY_ALREADY_PAID',

  // Attendance
  ATTENDANCE_ALREADY_CHECKED_IN: 'ATTENDANCE_ALREADY_CHECKED_IN',
  ATTENDANCE_NOT_CHECKED_IN: 'ATTENDANCE_NOT_CHECKED_IN',
  ATTENDANCE_OUT_OF_RANGE: 'ATTENDANCE_OUT_OF_RANGE',

  // Upload
  UPLOAD_FILE_TOO_LARGE: 'UPLOAD_FILE_TOO_LARGE',
  UPLOAD_INVALID_TYPE: 'UPLOAD_INVALID_TYPE',
  UPLOAD_MAX_IMAGES: 'UPLOAD_MAX_IMAGES',

  // User
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  USER_LOGIN_EXISTS: 'USER_LOGIN_EXISTS',
  CANNOT_DELETE_SELF: 'CANNOT_DELETE_SELF',

  // General
  NOT_FOUND: 'NOT_FOUND',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

export const ERROR_MESSAGES: Record<ErrorCode, { uz: string; en: string; ru: string }> = {
  AUTH_INVALID_CREDENTIALS: {
    uz: "Login yoki parol noto'g'ri",
    en: 'Invalid login or password',
    ru: 'Неверный логин или пароль',
  },
  AUTH_TOKEN_EXPIRED: {
    uz: 'Sessiya muddati tugagan',
    en: 'Session expired',
    ru: 'Сессия истекла',
  },
  AUTH_TOKEN_INVALID: {
    uz: "Token noto'g'ri",
    en: 'Invalid token',
    ru: 'Неверный токен',
  },
  AUTH_TOKEN_MISSING: {
    uz: 'Avtorizatsiya kerak',
    en: 'Authorization required',
    ru: 'Требуется авторизация',
  },
  AUTH_REFRESH_TOKEN_INVALID: {
    uz: 'Refresh token yaroqsiz',
    en: 'Invalid refresh token',
    ru: 'Неверный refresh токен',
  },
  AUTH_REFRESH_TOKEN_REUSED: {
    uz: 'Refresh token qayta ishlatilgan — barcha sessiyalar bekor',
    en: 'Refresh token reused — all sessions revoked',
    ru: 'Refresh токен повторно использован — все сессии отозваны',
  },
  AUTH_USER_INACTIVE: {
    uz: 'Foydalanuvchi faol emas',
    en: 'User is inactive',
    ru: 'Пользователь неактивен',
  },
  AUTH_USER_DELETED: {
    uz: "Foydalanuvchi o'chirilgan",
    en: 'User has been deleted',
    ru: 'Пользователь удален',
  },
  AUTH_FORBIDDEN: {
    uz: 'Ruxsat yo\'q',
    en: 'Access denied',
    ru: 'Доступ запрещён',
  },
  VALIDATION_ERROR: {
    uz: "Ma'lumotlar noto'g'ri",
    en: 'Validation error',
    ru: 'Ошибка валидации',
  },
  VALIDATION_PHONE_INVALID: {
    uz: "Telefon raqam noto'g'ri (+998XXXXXXXXX)",
    en: 'Invalid phone number (+998XXXXXXXXX)',
    ru: 'Неверный номер телефона (+998XXXXXXXXX)',
  },
  VALIDATION_PASSWORD_WEAK: {
    uz: 'Parol kamida 6 ta belgi, harf va raqam bo\'lishi kerak',
    en: 'Password must be at least 6 characters with letters and numbers',
    ru: 'Пароль должен содержать минимум 6 символов, буквы и цифры',
  },
  PRODUCT_NOT_FOUND: { uz: 'Mahsulot topilmadi', en: 'Product not found', ru: 'Товар не найден' },
  PRODUCT_DELETED: {
    uz: "Mahsulot o'chirilgan",
    en: 'Product has been deleted',
    ru: 'Товар удален',
  },
  CATEGORY_NOT_FOUND: {
    uz: 'Kategoriya topilmadi',
    en: 'Category not found',
    ru: 'Категория не найдена',
  },
  CATEGORY_HAS_PRODUCTS: {
    uz: "Kategoriyada mahsulotlar bor — avval o'chiring",
    en: 'Category has products — remove them first',
    ru: 'В категории есть товары — сначала удалите их',
  },
  RECEIPT_NOT_FOUND: { uz: 'Chek topilmadi', en: 'Receipt not found', ru: 'Чек не найден' },
  RECEIPT_EMPTY_CART: { uz: 'Savat bo\'sh', en: 'Cart is empty', ru: 'Корзина пуста' },
  RECEIPT_INVALID_PAYMENT: {
    uz: "To'lov usuli noto'g'ri",
    en: 'Invalid payment method',
    ru: 'Неверный способ оплаты',
  },
  RECEIPT_MIXED_SUM_MISMATCH: {
    uz: "Aralash to'lov yig'indisi mos emas",
    en: 'Mixed payment sum does not match total',
    ru: 'Сумма смешанной оплаты не совпадает с итогом',
  },
  RECEIPT_DEBT_NO_CUSTOMER: {
    uz: 'Qarzga sotuv uchun mijoz tanlang',
    en: 'Customer required for debt payment',
    ru: 'Для продажи в долг выберите клиента',
  },
  RETURN_PERIOD_EXPIRED: {
    uz: 'Vozvrat muddati o\'tgan (14 kun)',
    en: 'Return period expired (14 days)',
    ru: 'Срок возврата истёк (14 дней)',
  },
  RETURN_QUANTITY_EXCEEDED: {
    uz: 'Vozvrat miqdori oshib ketdi',
    en: 'Return quantity exceeded',
    ru: 'Превышено количество для возврата',
  },
  RETURN_ALREADY_RETURNED: {
    uz: 'Bu mahsulot allaqachon qaytarilgan',
    en: 'This item has already been returned',
    ru: 'Этот товар уже возвращён',
  },
  DEBT_NOT_FOUND: { uz: 'Qarz topilmadi', en: 'Debt not found', ru: 'Долг не найден' },
  DEBT_ALREADY_PAID: {
    uz: 'Bu qarz allaqachon to\'langan',
    en: 'This debt is already paid',
    ru: 'Этот долг уже оплачен',
  },
  DEBT_LIMIT_EXCEEDED: {
    uz: 'Mijoz qarz limiti oshib ketdi',
    en: 'Customer debt limit exceeded',
    ru: 'Превышен лимит долга клиента',
  },
  DEBT_OVERPAYMENT: {
    uz: 'To\'lov qarz summasidan oshib ketdi',
    en: 'Payment exceeds debt amount',
    ru: 'Платеж превышает сумму долга',
  },
  CUSTOMER_NOT_FOUND: { uz: 'Mijoz topilmadi', en: 'Customer not found', ru: 'Клиент не найден' },
  CUSTOMER_HAS_ACTIVE_DEBTS: {
    uz: 'Mijozning faol qarzlari bor',
    en: 'Customer has active debts',
    ru: 'У клиента есть активные долги',
  },
  CUSTOMER_PHONE_EXISTS: {
    uz: 'Bu telefon raqam mavjud',
    en: 'Phone number already exists',
    ru: 'Номер телефона уже существует',
  },
  SUPPLIER_NOT_FOUND: {
    uz: "Ta'minotchi topilmadi",
    en: 'Supplier not found',
    ru: 'Поставщик не найден',
  },
  SALARY_ALREADY_CALCULATED: {
    uz: 'Bu oy uchun oylik allaqachon hisoblangan',
    en: 'Salary already calculated for this month',
    ru: 'Зарплата за этот месяц уже рассчитана',
  },
  SALARY_ALREADY_PAID: {
    uz: "To'langan oylikni qayta hisoblash mumkin emas",
    en: 'Cannot recalculate a paid salary',
    ru: 'Нельзя пересчитать выплаченную зарплату',
  },
  ATTENDANCE_ALREADY_CHECKED_IN: {
    uz: 'Siz allaqachon "Keldim" belgisini qo\'ygansiz',
    en: 'Already checked in',
    ru: 'Вы уже отметили приход',
  },
  ATTENDANCE_NOT_CHECKED_IN: {
    uz: 'Avval "Keldim" tugmasini bosing',
    en: 'Not checked in yet',
    ru: 'Сначала отметьте приход',
  },
  ATTENDANCE_OUT_OF_RANGE: {
    uz: 'Do\'kondan uzoqdasiz — GPS tekshiruvi muvaffaqiyatsiz',
    en: 'Out of allowed range — GPS check failed',
    ru: 'Вы вне допустимого радиуса — проверка GPS не пройдена',
  },
  UPLOAD_FILE_TOO_LARGE: {
    uz: 'Fayl hajmi 5MB dan katta',
    en: 'File size exceeds 5MB',
    ru: 'Размер файла превышает 5МБ',
  },
  UPLOAD_INVALID_TYPE: {
    uz: 'Fayl formati ruxsat etilmagan',
    en: 'File type not allowed',
    ru: 'Тип файла не разрешён',
  },
  UPLOAD_MAX_IMAGES: {
    uz: 'Maksimum 8 ta rasm',
    en: 'Maximum 8 images allowed',
    ru: 'Максимум 8 изображений',
  },
  USER_NOT_FOUND: {
    uz: 'Foydalanuvchi topilmadi',
    en: 'User not found',
    ru: 'Пользователь не найден',
  },
  USER_LOGIN_EXISTS: {
    uz: 'Bu login band',
    en: 'Login already taken',
    ru: 'Логин уже занят',
  },
  CANNOT_DELETE_SELF: {
    uz: "O'zingizni o'chira olmaysiz",
    en: 'Cannot delete yourself',
    ru: 'Нельзя удалить себя',
  },
  NOT_FOUND: { uz: 'Topilmadi', en: 'Not found', ru: 'Не найдено' },
  INTERNAL_ERROR: { uz: 'Server xatosi', en: 'Internal server error', ru: 'Ошибка сервера' },
  RATE_LIMIT_EXCEEDED: {
    uz: 'Juda ko\'p so\'rov — biroz kuting',
    en: 'Too many requests — please wait',
    ru: 'Слишком много запросов — подождите',
  },
};
