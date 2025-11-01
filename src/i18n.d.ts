interface I18n {
  t(key: string, interpolationOptions?: Record<string, any>): string;
}

declare const i18n: I18n;
export default i18n;