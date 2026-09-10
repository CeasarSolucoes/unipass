import { describe, expect, it } from "vitest";
import { formatCpf, isValidCpf, maskCpf, onlyDigits, parseMemberIdentifier } from "@/lib/cpf";

describe("isValidCpf", () => {
  it("aceita CPFs válidos, com e sem máscara", () => {
    expect(isValidCpf("52998224725")).toBe(true);
    expect(isValidCpf("529.982.247-25")).toBe(true);
    expect(isValidCpf("111.444.777-35")).toBe(true);
    expect(isValidCpf("98765432100")).toBe(true);
  });

  it("rejeita dígito verificador errado", () => {
    expect(isValidCpf("52998224726")).toBe(false);
    expect(isValidCpf("12345678900")).toBe(false);
  });

  it("rejeita sequências repetidas, que passam no cálculo mas não existem", () => {
    for (const d of "0123456789") {
      expect(isValidCpf(d.repeat(11))).toBe(false);
    }
  });

  it("rejeita comprimento errado", () => {
    expect(isValidCpf("")).toBe(false);
    expect(isValidCpf("529982247")).toBe(false);
    expect(isValidCpf("529982247251")).toBe(false);
  });
});

describe("formatação", () => {
  it("onlyDigits remove pontuação", () => {
    expect(onlyDigits("529.982.247-25")).toBe("52998224725");
  });

  it("formatCpf aplica a máscara", () => {
    expect(formatCpf("52998224725")).toBe("529.982.247-25");
  });

  it("maskCpf esconde início e fim — é o que o parceiro vê (D39)", () => {
    expect(maskCpf("52998224725")).toBe("***.982.247-**");
  });

  it("maskCpf não vaza nada quando a entrada é inesperada", () => {
    expect(maskCpf("123")).toBe("***.***.***-**");
  });
});

describe("parseMemberIdentifier · campo único do balcão (D06)", () => {
  it("reconhece CPF com e sem máscara", () => {
    expect(parseMemberIdentifier("529.982.247-25")).toEqual({
      kind: "cpf",
      value: "52998224725",
    });
  });

  it("reconhece member_code", () => {
    expect(parseMemberIdentifier("KNN-7F4K2")).toEqual({
      kind: "member_code",
      value: "KNN-7F4K2",
    });
  });

  it("aceita código em minúsculas", () => {
    expect(parseMemberIdentifier("knn-7f4k2").kind).toBe("member_code");
  });

  it("insere o hífen que o atendente esqueceu", () => {
    expect(parseMemberIdentifier("KNN7F4K2")).toEqual({
      kind: "member_code",
      value: "KNN-7F4K2",
    });
    expect(parseMemberIdentifier("AUR9X2M4")).toEqual({
      kind: "member_code",
      value: "AUR-9X2M4",
    });
  });

  it("11 dígitos com verificador errado é inválido, não vira código", () => {
    expect(parseMemberIdentifier("52998224726").kind).toBe("invalid");
  });

  it("lixo é lixo", () => {
    expect(parseMemberIdentifier("").kind).toBe("invalid");
    expect(parseMemberIdentifier("abc").kind).toBe("invalid");
    expect(parseMemberIdentifier("KNN-").kind).toBe("invalid");
  });
});
