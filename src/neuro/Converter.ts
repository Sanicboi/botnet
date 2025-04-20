import { SupportedModels } from "../utils/Models";

const modelToTokenCost: Map<SupportedModels, number> = new Map();
modelToTokenCost.set("gpt-4o-mini", 0.0000006);
modelToTokenCost.set("gpt-4o", 0.00001);
modelToTokenCost.set("gpt-4-turbo", 0.00003);

export class Converter {
  public static SMTUSD(smt: number): number {
    return this.RUBUSD(this.SMTRUB(smt));
  }

  public static SMTRUB(smt: number): number {
    return smt * 0.00034;
  }

  public static SMTTK(smt: number, model: SupportedModels): number {
    return this.USDTK(this.SMTUSD(smt), model);
  }

  public static TKSMT(tk: number, model: SupportedModels): number {
    return this.USDSMT(this.TKUSD(tk, model));
  }

  public static TKRUB(tk: number, model: SupportedModels): number {
    return this.USDRUB(this.TKUSD(tk, model));
  }

  public static TKUSD(tk: number, model: SupportedModels): number {
    const r = modelToTokenCost.get(model);
    if (!r) throw new Error("Model not found");

    return tk * r;
  }

  public static USDRUB(usd: number): number {
    return usd * 83.18;
  }

  public static USDSMT(usd: number): number {
    return this.RUBSMT(this.USDRUB(usd));
  }

  public static USDTK(usd: number, model: SupportedModels): number {
    const r = modelToTokenCost.get(model);
    if (!r) throw new Error("Model not found");

    return usd / r;
  }

  public static RUBUSD(rub: number): number {
    return rub / 83.18;
  }

  public static RUBSMT(rub: number): number {
    return rub / 0.00034;
  }

  public static RUBTK(rub: number, model: SupportedModels): number {
    return this.USDTK(this.RUBUSD(rub), model);
  }

  public static TKTK(
    tk1: number,
    m1: SupportedModels,
    m2: SupportedModels,
  ): number {
    return this.USDTK(this.TKUSD(tk1, m1), m2);
  }
}
