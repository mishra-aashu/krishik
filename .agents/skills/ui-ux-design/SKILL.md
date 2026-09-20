---
name: ui-ux-design-system
description: >-
  Comprehensive guide and design system rules for creating modern, vibrant, user-centric interfaces,
  color palettes, typography, card elevations, micro-interactions, and visual hierarchy.
---

# Modern UI/UX Design System Guide

This skill provides guidelines and patterns for transforming basic application interfaces into modern, aesthetically pleasing, and highly engaging user experiences.

## 1. Color Palette & Aestetics (Krishi & Agri Theme)
- **Primary Accent**: Emerald / Forest Green (`#16A34A` / `#15803D`) - represents growth, crops, vitality.
- **Secondary Accent**: Golden Amber / Warm Gold (`#EAB308` / `#D97706`) - represents harvest, sunshine, premium quality.
- **Surfaces & Cards**: Soft mint tints (`rgba(22, 163, 74, 0.04)`), ultra-clean white cards (`#FFFFFF`), light border strokes (`rgba(0,0,0,0.06)`).
- **Dark Mode Surfaces**: Deep slate-900 (`#0F172A`), card surfaces (`#1E293B`), subtle border (`#334155`).

## 2. Card Layouts & Visual Elevation
- **Border Radius**: Smooth rounded corners (`16px` for cards, `12px` for buttons, `9999px` for pills/avatars).
- **Shadows & Glassmorphism**:
  - Web: `box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01)`
  - Soft backdrop filters and glass headers where appropriate.

## 3. Micro-Interactions & Feedback
- Scale pressables (`activeOpacity: 0.8`, `transform: [{ scale: 0.98 }]`).
- Smooth entry animations (FadeIn, SlideIn, Springify).
- Interactive active tab indicators and hover highlights.

## 4. Typography Hierarchy
- Display Headers: Bold, high contrast (`fontWeight: '800'`).
- Section Titles: Semi-bold (`fontWeight: '700'`).
- Metadata & Tags: Compact uppercase code tags with soft pastel pill backgrounds.
