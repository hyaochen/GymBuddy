import { GoogleGenerativeAI } from "@google/generative-ai";
import fs from "fs";
import path from "path";
import sharp from "sharp";

const API_KEY = "AIzaSyCT3YBM5xLlhpIxaFQYOpVHfyohIihPoAs";
const genAI = new GoogleGenerativeAI(API_KEY);

const projects = [
  {
    id: "t_web",
    path: "C:/Users/a0927/Desktop/t_web",
    name: "進貨存管",
    shortName: "進貨管理",
    description: "專業進貨存管系統",
    iconPrompt: "A modern flat design app icon, 512x512 pixels. Dark purple (#1a0533) rounded square background. In the center, a white minimalist box/package icon with an upward arrow, symbolizing inventory management. Clean, simple, no text, no gradients, suitable for phone home screen PWA icon.",
    themeColor: "#7c3aed",
    bgColor: "#1a0533",
  },
  {
    id: "Closet",
    path: "C:/Users/a0927/Desktop/Closet",
    name: "ClosetIQ",
    shortName: "ClosetIQ",
    description: "Smart wardrobe management",
    iconPrompt: "A modern flat design app icon, 512x512 pixels. Dark pink (#2d0a1e) rounded square background. In the center, a white minimalist clothes hanger icon, clean and simple. No text, no gradients, suitable for phone home screen PWA icon.",
    themeColor: "#ec4899",
    bgColor: "#2d0a1e",
  },
  {
    id: "fly",
    path: "C:/Users/a0927/Desktop/fly",
    name: "FareHawk",
    shortName: "FareHawk",
    description: "Flight fare tracking",
    iconPrompt: "A modern flat design app icon, 512x512 pixels. Dark navy blue (#0a1929) rounded square background. In the center, a white minimalist airplane icon tilted at 45 degrees upward, clean and simple. No text, no gradients, suitable for phone home screen PWA icon.",
    themeColor: "#0ea5e9",
    bgColor: "#0a1929",
  },
  {
    id: "sale",
    path: "C:/Users/a0927/Desktop/sale",
    name: "洪記軒",
    shortName: "洪記軒",
    description: "洪記軒滷味線上商店",
    iconPrompt: "A modern flat design app icon, 512x512 pixels. Dark red (#290a0a) rounded square background. In the center, a white minimalist bowl with steam rising, symbolizing food/braised meat shop. Clean, simple, no text, no gradients, suitable for phone home screen PWA icon.",
    themeColor: "#ef4444",
    bgColor: "#290a0a",
  },
  {
    id: "lang",
    path: "C:/Users/a0927/Desktop/lang",
    name: "EchoLingo",
    shortName: "EchoLingo",
    description: "Language learning lab",
    iconPrompt: "A modern flat design app icon, 512x512 pixels. Dark green (#0a2912) rounded square background. In the center, a white minimalist speech bubble with sound waves, symbolizing language learning. Clean, simple, no text, no gradients, suitable for phone home screen PWA icon.",
    themeColor: "#22c55e",
    bgColor: "#0a2912",
  },
  {
    id: "TEETH",
    path: "C:/Users/a0927/Desktop/TEETH",
    name: "Dental 3D",
    shortName: "Dental3D",
    description: "Dental 3D visualization",
    iconPrompt: "A modern flat design app icon, 512x512 pixels. Dark cyan (#0a2129) rounded square background. In the center, a white minimalist tooth icon, clean geometric style. No text, no gradients, suitable for phone home screen PWA icon.",
    themeColor: "#06b6d4",
    bgColor: "#0a2129",
  },
];

async function generateWithGemini(project) {
  const model = genAI.getGenerativeModel({
    model: "gemini-3-pro-image-preview",
    generationConfig: {
      responseModalities: ["TEXT", "IMAGE"],
    },
  });

  console.log(`  Calling Gemini API...`);
  const result = await model.generateContent(project.iconPrompt);
  const response = result.response;

  for (const part of response.candidates[0].content.parts) {
    if (part.inlineData) {
      const imageData = Buffer.from(part.inlineData.data, "base64");
      console.log(`  Got image from Gemini (${imageData.length} bytes)`);
      return imageData;
    }
  }
  throw new Error("No image in Gemini response");
}

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return { r, g, b };
}

async function generateWithCanvas(project) {
  const { createCanvas } = await import("canvas");
  console.log(`  Generating with canvas fallback...`);

  const size = 512;
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext("2d");

  // Dark rounded rectangle background
  const radius = 100;
  const bg = hexToRgb(project.bgColor);
  ctx.fillStyle = `rgb(${bg.r},${bg.g},${bg.b})`;
  ctx.beginPath();
  ctx.moveTo(radius, 0);
  ctx.lineTo(size - radius, 0);
  ctx.quadraticCurveTo(size, 0, size, radius);
  ctx.lineTo(size, size - radius);
  ctx.quadraticCurveTo(size, size, size - radius, size);
  ctx.lineTo(radius, size);
  ctx.quadraticCurveTo(0, size, 0, size - radius);
  ctx.lineTo(0, radius);
  ctx.quadraticCurveTo(0, 0, radius, 0);
  ctx.closePath();
  ctx.fill();

  // Draw icon symbol based on project
  ctx.strokeStyle = "white";
  ctx.fillStyle = "white";
  ctx.lineWidth = 12;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  const cx = size / 2;
  const cy = size / 2;

  switch (project.id) {
    case "t_web": // Box with arrow
      // Box
      ctx.strokeRect(cx - 80, cy - 40, 160, 120);
      ctx.beginPath();
      ctx.moveTo(cx - 80, cy - 40);
      ctx.lineTo(cx, cy - 100);
      ctx.lineTo(cx + 80, cy - 40);
      ctx.stroke();
      // Arrow up
      ctx.beginPath();
      ctx.moveTo(cx, cy + 50);
      ctx.lineTo(cx, cy - 20);
      ctx.moveTo(cx - 30, cy + 10);
      ctx.lineTo(cx, cy - 20);
      ctx.lineTo(cx + 30, cy + 10);
      ctx.stroke();
      break;

    case "Closet": // Hanger
      ctx.beginPath();
      // Hook
      ctx.arc(cx, cy - 80, 20, Math.PI, 0);
      // Hanger arms
      ctx.lineTo(cx + 120, cy + 40);
      ctx.lineTo(cx - 120, cy + 40);
      ctx.closePath();
      ctx.stroke();
      break;

    case "fly": // Airplane
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(-Math.PI / 6);
      // Body
      ctx.beginPath();
      ctx.ellipse(0, 0, 120, 20, 0, 0, Math.PI * 2);
      ctx.fill();
      // Wings
      ctx.beginPath();
      ctx.moveTo(-10, -10);
      ctx.lineTo(-60, -90);
      ctx.lineTo(30, -10);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-10, 10);
      ctx.lineTo(-60, 90);
      ctx.lineTo(30, 10);
      ctx.fill();
      // Tail
      ctx.beginPath();
      ctx.moveTo(-100, -5);
      ctx.lineTo(-130, -50);
      ctx.lineTo(-80, -5);
      ctx.fill();
      ctx.restore();
      break;

    case "sale": // Bowl with steam
      // Bowl
      ctx.beginPath();
      ctx.arc(cx, cy + 20, 100, 0, Math.PI);
      ctx.closePath();
      ctx.stroke();
      ctx.fill();
      // Rim
      ctx.beginPath();
      ctx.ellipse(cx, cy + 20, 110, 20, 0, 0, Math.PI * 2);
      ctx.stroke();
      // Steam lines
      for (let i = -1; i <= 1; i++) {
        ctx.beginPath();
        const sx = cx + i * 40;
        ctx.moveTo(sx, cy - 20);
        ctx.quadraticCurveTo(sx + 15, cy - 55, sx, cy - 80);
        ctx.quadraticCurveTo(sx - 15, cy - 105, sx, cy - 130);
        ctx.stroke();
      }
      break;

    case "lang": // Speech bubble with waves
      // Speech bubble
      ctx.beginPath();
      ctx.ellipse(cx - 20, cy - 10, 110, 80, 0, 0, Math.PI * 2);
      ctx.fill();
      // Tail
      ctx.beginPath();
      ctx.moveTo(cx - 60, cy + 50);
      ctx.lineTo(cx - 100, cy + 100);
      ctx.lineTo(cx - 20, cy + 50);
      ctx.fill();
      // Sound waves (dark on white)
      ctx.strokeStyle = project.bgColor;
      ctx.lineWidth = 8;
      for (let i = 1; i <= 3; i++) {
        ctx.beginPath();
        ctx.arc(cx + 20, cy - 10, 20 + i * 20, -Math.PI / 4, Math.PI / 4);
        ctx.stroke();
      }
      break;

    case "TEETH": // Tooth
      ctx.beginPath();
      // Crown
      ctx.moveTo(cx - 60, cy - 20);
      ctx.quadraticCurveTo(cx - 70, cy - 100, cx - 30, cy - 100);
      ctx.quadraticCurveTo(cx, cy - 70, cx, cy - 70);
      ctx.quadraticCurveTo(cx, cy - 70, cx + 30, cy - 100);
      ctx.quadraticCurveTo(cx + 70, cy - 100, cx + 60, cy - 20);
      // Roots
      ctx.quadraticCurveTo(cx + 70, cy + 60, cx + 30, cy + 110);
      ctx.quadraticCurveTo(cx + 10, cy + 50, cx, cy + 50);
      ctx.quadraticCurveTo(cx - 10, cy + 50, cx - 30, cy + 110);
      ctx.quadraticCurveTo(cx - 70, cy + 60, cx - 60, cy - 20);
      ctx.closePath();
      ctx.fill();
      break;
  }

  return canvas.toBuffer("image/png");
}

async function processProject(project) {
  console.log(`\n=== ${project.id} (${project.name}) ===`);

  // Ensure public directory exists
  const publicDir = path.join(project.path, "public");
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
    console.log(`  Created ${publicDir}`);
  }

  // Try Gemini first, fallback to canvas
  let imageBuffer;
  try {
    imageBuffer = await generateWithGemini(project);
  } catch (err) {
    console.log(`  Gemini failed: ${err.message}`);
    imageBuffer = await generateWithCanvas(project);
  }

  // Save 512x512
  const icon512 = await sharp(imageBuffer).resize(512, 512).png().toBuffer();
  fs.writeFileSync(path.join(publicDir, "icon-512.png"), icon512);
  console.log(`  Saved icon-512.png`);

  // Save 192x192
  const icon192 = await sharp(imageBuffer).resize(192, 192).png().toBuffer();
  fs.writeFileSync(path.join(publicDir, "icon-192.png"), icon192);
  console.log(`  Saved icon-192.png`);

  // Save apple-touch-icon 180x180
  const appleIcon = await sharp(imageBuffer).resize(180, 180).png().toBuffer();
  fs.writeFileSync(path.join(publicDir, "apple-touch-icon.png"), appleIcon);
  console.log(`  Saved apple-touch-icon.png`);

  // Create/update manifest.json
  const manifestPath = path.join(publicDir, "manifest.json");
  let manifest = {};
  if (fs.existsSync(manifestPath)) {
    try {
      manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
      console.log(`  Updating existing manifest.json`);
    } catch (e) {
      console.log(`  Existing manifest.json is invalid, creating new`);
    }
  } else {
    console.log(`  Creating new manifest.json`);
  }

  manifest.name = manifest.name || project.name;
  manifest.short_name = manifest.short_name || project.shortName;
  manifest.description = manifest.description || project.description;
  manifest.start_url = manifest.start_url || "/";
  manifest.display = manifest.display || "standalone";
  manifest.background_color = manifest.background_color || "#000000";
  manifest.theme_color = project.themeColor;
  manifest.icons = [
    {
      src: "/icon-192.png",
      sizes: "192x192",
      type: "image/png",
      purpose: "any maskable",
    },
    {
      src: "/icon-512.png",
      sizes: "512x512",
      type: "image/png",
      purpose: "any maskable",
    },
  ];

  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log(`  Saved manifest.json`);

  return true;
}

async function main() {
  console.log("PWA Icon Generator - Starting...\n");

  const results = [];
  for (const project of projects) {
    try {
      await processProject(project);
      results.push({ id: project.id, status: "OK" });
    } catch (err) {
      console.error(`  FAILED: ${err.message}`);
      results.push({ id: project.id, status: "FAILED", error: err.message });
    }
  }

  console.log("\n\n=== SUMMARY ===");
  for (const r of results) {
    console.log(`  ${r.id}: ${r.status}${r.error ? " - " + r.error : ""}`);
  }
}

main();
