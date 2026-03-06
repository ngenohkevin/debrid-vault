import { describe, it, expect } from "vitest";
import { formatBytes, formatSpeed, formatETA, getStatusColor } from "@/lib/formatters";

describe("formatBytes", () => {
  it("formats zero bytes", () => {
    expect(formatBytes(0)).toBe("0 B");
  });

  it("formats bytes", () => {
    expect(formatBytes(500)).toBe("500 B");
  });

  it("formats kilobytes", () => {
    expect(formatBytes(1024)).toBe("1 KB");
    expect(formatBytes(1536)).toBe("1.5 KB");
  });

  it("formats megabytes", () => {
    expect(formatBytes(1048576)).toBe("1 MB");
    expect(formatBytes(1572864)).toBe("1.5 MB");
  });

  it("formats gigabytes", () => {
    expect(formatBytes(1073741824)).toBe("1 GB");
  });

  it("formats terabytes", () => {
    expect(formatBytes(1099511627776)).toBe("1 TB");
  });
});

describe("formatSpeed", () => {
  it("formats speed with /s suffix", () => {
    expect(formatSpeed(1048576)).toBe("1 MB/s");
    expect(formatSpeed(0)).toBe("0 B/s");
  });
});

describe("formatETA", () => {
  it("returns -- for zero or negative", () => {
    expect(formatETA(0)).toBe("--");
    expect(formatETA(-1)).toBe("--");
  });

  it("returns -- for infinity", () => {
    expect(formatETA(Infinity)).toBe("--");
  });

  it("formats seconds", () => {
    expect(formatETA(45)).toBe("45s");
  });

  it("formats minutes and seconds", () => {
    expect(formatETA(125)).toBe("2m 5s");
  });

  it("formats hours and minutes", () => {
    expect(formatETA(3661)).toBe("1h 1m");
  });
});

describe("getStatusColor", () => {
  it("returns correct colors for known statuses", () => {
    expect(getStatusColor("downloading")).toBe("text-blue-400");
    expect(getStatusColor("completed")).toBe("text-green-400");
    expect(getStatusColor("error")).toBe("text-red-400");
    expect(getStatusColor("resolving")).toBe("text-yellow-400");
    expect(getStatusColor("moving")).toBe("text-purple-400");
  });

  it("returns muted for unknown status", () => {
    expect(getStatusColor("unknown")).toBe("text-muted-foreground");
  });
});
