import { defineMessages, type Locale } from "@snapbell/sdk";
import { z } from "zod";
import { currentLocale } from "./context";

const n = (v: unknown) => (typeof v === "bigint" ? Number(v) : (v as number));

export const validationMessages = defineMessages(
  {
    required: "This field is required.",
    invalid: "This value isn't valid.",
    expected: (type: string) => `Expected ${type}.`,
    minChars: (min: number) => `Use at least ${min} characters.`,
    maxChars: (max: number) => `Use at most ${max} characters.`,
    minNumber: (min: number) => `Must be at least ${min}.`,
    maxNumber: (max: number) => `Must be at most ${max}.`,
    minItems: (min: number) => `Add at least ${min}.`,
    maxItems: (max: number) => `Add no more than ${max}.`,
    email: "Enter a valid email address.",
    url: "Enter a valid link.",
    format: "This format isn't valid.",
    oneOf: (values: string) => `Choose one of: ${values}.`,
    unknownKeys: (keys: string) => `Unexpected fields: ${keys}.`,
    summary: (field: string, message: string) => `${field}: ${message}`,
    // Custom rules
    date: "Enter a valid date.",
    usState: "Use a two-letter US state.",
    zip: "Use a 5-digit ZIP code.",
    usOnly: "We ship within the US only.",
    promoCodeFormat: "Use 3–20 letters or digits.",
    deliveryOption: "Offer at least one delivery option.",
    hexColor: "Use a hex color like #2F6F73.",
    enterName: "Enter your name.",
    selfieConsent: "Agree to the selfie search terms to continue.",
    fields: {
      email: "Email",
      phone: "Phone",
      name: "Name",
      password: "Password",
      studioName: "Studio name",
      firstName: "First name",
      lastName: "Last name",
      group: "Grade or team",
      line1: "Address",
      line2: "Apartment, suite",
      city: "City",
      state: "State",
      postalCode: "ZIP code",
      country: "Country",
      code: "Code",
      destination: "Phone or email",
      amountCents: "Amount",
      reason: "Reason",
      deadline: "Deadline",
      date: "Date",
      brandColor: "Brand color",
      body: "Request",
    } as Record<string, string>,
  },
  {
    ru: {
      required: "Это поле обязательно.",
      invalid: "Недопустимое значение.",
      expected: (type) => `Ожидается значение типа ${type}.`,
      minChars: (min) => `Минимум символов: ${min}.`,
      maxChars: (max) => `Максимум символов: ${max}.`,
      minNumber: (min) => `Значение должно быть не меньше ${min}.`,
      maxNumber: (max) => `Значение должно быть не больше ${max}.`,
      minItems: (min) => `Добавьте не меньше ${min}.`,
      maxItems: (max) => `Добавьте не больше ${max}.`,
      email: "Введите корректный адрес электронной почты.",
      url: "Введите корректную ссылку.",
      format: "Неверный формат.",
      oneOf: (values) => `Выберите одно из значений: ${values}.`,
      unknownKeys: (keys) => `Неизвестные поля: ${keys}.`,
      summary: (field, message) => `${field}: ${message}`,
      date: "Введите корректную дату.",
      usState: "Укажите штат США двумя буквами.",
      zip: "Укажите 5-значный почтовый индекс (ZIP).",
      usOnly: "Мы доставляем только по США.",
      promoCodeFormat: "Используйте от 3 до 20 латинских букв или цифр.",
      deliveryOption: "Предложите хотя бы один способ доставки.",
      hexColor: "Укажите цвет в формате HEX, например #2F6F73.",
      enterName: "Укажите ваше имя.",
      selfieConsent: "Чтобы продолжить, примите условия поиска по селфи.",
      fields: {
        email: "Email",
        phone: "Телефон",
        name: "Имя",
        password: "Пароль",
        studioName: "Название студии",
        firstName: "Имя",
        lastName: "Фамилия",
        group: "Класс или команда",
        line1: "Адрес",
        line2: "Квартира, офис",
        city: "Город",
        state: "Штат",
        postalCode: "Индекс",
        country: "Страна",
        code: "Код",
        destination: "Телефон или email",
        amountCents: "Сумма",
        reason: "Причина",
        deadline: "Срок",
        date: "Дата",
        brandColor: "Фирменный цвет",
        body: "Запрос",
      },
    },
    uz: {
      required: "Bu maydon toʻldirilishi shart.",
      invalid: "Bu qiymat yaroqsiz.",
      expected: (type) => `${type} turidagi qiymat kutilmoqda.`,
      minChars: (min) => `Kamida ${min} ta belgi kiriting.`,
      maxChars: (max) => `Koʻpi bilan ${max} ta belgi kiriting.`,
      minNumber: (min) => `Qiymat kamida ${min} boʻlishi kerak.`,
      maxNumber: (max) => `Qiymat koʻpi bilan ${max} boʻlishi kerak.`,
      minItems: (min) => `Kamida ${min} ta qoʻshing.`,
      maxItems: (max) => `Koʻpi bilan ${max} ta qoʻshing.`,
      email: "Toʻgʻri email manzilini kiriting.",
      url: "Toʻgʻri havolani kiriting.",
      format: "Format notoʻgʻri.",
      oneOf: (values) => `Quyidagilardan birini tanlang: ${values}.`,
      unknownKeys: (keys) => `Nomaʼlum maydonlar: ${keys}.`,
      summary: (field, message) => `${field}: ${message}`,
      date: "Toʻgʻri sanani kiriting.",
      usState: "AQSh shtatini ikki harf bilan kiriting.",
      zip: "5 xonali pochta indeksini (ZIP) kiriting.",
      usOnly: "Biz faqat AQSh boʻylab yetkazib beramiz.",
      promoCodeFormat: "3 tadan 20 tagacha lotin harfi yoki raqamdan foydalaning.",
      deliveryOption: "Kamida bitta yetkazib berish usulini taklif qiling.",
      hexColor: "Rangni HEX formatida kiriting, masalan #2F6F73.",
      enterName: "Ismingizni kiriting.",
      selfieConsent: "Davom etish uchun selfi orqali qidirish shartlariga rozilik bildiring.",
      fields: {
        email: "Email",
        phone: "Telefon",
        name: "Ism",
        password: "Parol",
        studioName: "Studiya nomi",
        firstName: "Ism",
        lastName: "Familiya",
        group: "Sinf yoki jamoa",
        line1: "Manzil",
        line2: "Xonadon, ofis",
        city: "Shahar",
        state: "Shtat",
        postalCode: "Pochta indeksi",
        country: "Mamlakat",
        code: "Kod",
        destination: "Telefon yoki email",
        amountCents: "Summa",
        reason: "Sabab",
        deadline: "Muddat",
        date: "Sana",
        brandColor: "Brend rangi",
        body: "Soʻrov",
      },
    },
  },
);

/** Message for a custom rule, resolved when validation runs (so it follows the request's language). */
export const v = () => validationMessages[currentLocale()];

/** Zod error map for one language: friendly wording for common issues, Zod's own locale for the rest. */
export function zodErrorMap(locale: Locale): z.core.$ZodErrorMap {
  const t = validationMessages[locale];
  const fallback = z.locales[locale]().localeError;
  return (issue) => {
    switch (issue.code) {
      case "invalid_type":
        return issue.input === undefined || issue.input === null ? t.required : t.expected(issue.expected);
      case "too_small":
        if (issue.origin === "string") return n(issue.minimum) <= 1 ? t.required : t.minChars(n(issue.minimum));
        if (issue.origin === "number" || issue.origin === "int") return t.minNumber(n(issue.minimum));
        if (issue.origin === "array" || issue.origin === "set") return t.minItems(n(issue.minimum));
        break;
      case "too_big":
        if (issue.origin === "string") return t.maxChars(n(issue.maximum));
        if (issue.origin === "number" || issue.origin === "int") return t.maxNumber(n(issue.maximum));
        if (issue.origin === "array" || issue.origin === "set") return t.maxItems(n(issue.maximum));
        break;
      case "invalid_format":
        if (issue.format === "email") return t.email;
        if (issue.format === "url") return t.url;
        return t.format;
      case "invalid_value":
        return t.oneOf(issue.values.map(String).join(", "));
      case "unrecognized_keys":
        return t.unknownKeys(issue.keys.join(", "));
    }
    const message = fallback(issue);
    const text = typeof message === "string" ? message : (message?.message ?? t.invalid);
    // Zod's Uzbek locale writes oʻ/gʻ with U+2018; normalize to U+02BB like the rest of the product.
    return locale === "uz" ? text.replace(/‘/g, "ʻ") : text;
  };
}

/** Localized "Field: problem" line for a validation issue path. */
export function issueSummary(locale: Locale, path: string, message: string): string {
  const t = validationMessages[locale];
  const last = path.split(".").filter((p) => !/^\d+$/.test(p)).pop() ?? "";
  return t.summary(t.fields[last] ?? (path || t.fields.body!), message);
}
