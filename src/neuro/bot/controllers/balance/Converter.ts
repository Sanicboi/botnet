import { AIModel } from "../../../../entity/AIModel";

/**
 * Конвертер валют
 * USD - доллар
 * RUB - рубль
 * SMT - СмартТокен (полнейший развод если честно)
 * TK - токен определенной модели
 * Каждый метод имеет вид AB, переводит из A в B
 */
export class Converter {
  public static SMTUSD(smt: number): number {
    return this.RUBUSD(this.SMTRUB(smt));
  }

  public static SMTRUB(smt: number): number {
    return smt * 0.00034;
  }

  public static SMTTK(smt: number, model: AIModel): number {
    return this.USDTK(this.SMTUSD(smt), model);
  }

  public static TKSMT(tk: number, model: AIModel): number {
    return this.USDSMT(this.TKUSD(tk, model));
  }

  public static TKRUB(tk: number, model: AIModel): number {
    return this.USDRUB(this.TKUSD(tk, model));
  }

  public static TKUSD(tk: number, model: AIModel): number {
    const r = model.pricePerToken;

    return tk * r;
  }

  public static USDRUB(usd: number): number {
    return usd * 83.18;
  }

  public static USDSMT(usd: number): number {
    return this.RUBSMT(this.USDRUB(usd));
  }

  public static USDTK(usd: number, model: AIModel): number {
    const r = model.pricePerToken;

    return usd / r;
  }

  public static RUBUSD(rub: number): number {
    return rub / 83.18;
  }

  public static RUBSMT(rub: number): number {
    return rub / 0.00034;
  }

  public static RUBTK(rub: number, model: AIModel): number {
    return this.USDTK(this.RUBUSD(rub), model);
  }

  public static TKTK(tk1: number, m1: AIModel, m2: AIModel): number {
    return this.USDTK(this.TKUSD(tk1, m1), m2);
  }
}
