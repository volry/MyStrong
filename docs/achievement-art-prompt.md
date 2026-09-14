# Промпти для картинок досягнень

28 значків, чотири родини. Щоб набір виглядав як набір, а не як 28 різних картинок,
тримайся трьох правил: **той самий блок стилю** перед кожним описом, **та сама
палітра всередині родини**, **та сама система рівнів** (tier).

## Як генерувати

1. Згенеруй спочатку один еталон — `first` (найпростіший значок). Дивись, чи
   подобається стиль.
2. Далі для кожного наступного: **блок стилю** + рядок конкретного значка +
   речення `Same style, same line weight, same lighting and same framing as the
   reference image.` Якщо модель дозволяє прикріпити картинку — прикріплюй еталон.
3. Генеруй родинами (спершу всі «Постійність», потім «Рекорди» тощо) — у межах
   однієї сесії модель тримає стиль краще.
4. Зберігай як `public/achievements/<id>.png`, де `<id>` — з таблиць нижче
   (це ті самі id, що в `src/lib/achievements.ts`).

## Блок стилю (вставляй перед кожним описом)

```
Flat vector achievement badge for a minimalist mobile gym app.

Style: modern flat illustration, thick rounded strokes, simple geometric shapes,
two-tone shading, at most one soft tint per shape. No photorealism, no 3D render,
no bevels, no metallic reflections, no drop shadows, no textures, no background
scene, no mascot characters.

Composition: one centred subject inside a soft pastel circle. The subject fills
about 75% of the frame with even margins. Front view, symmetrical, square 1:1.

Colour: use only the palette given in the badge line below, plus white. The app
accent teal #0d9488 may appear once as a small secondary accent.

Absolutely no text, no letters, no numbers, no digits, no watermark, no signature.
The app prints the badge name underneath the icon.

Output: 1024x1024 PNG, transparent outside the circle. The icon must stay legible
when scaled down to 40x40 pixels, so keep shapes bold and details few.
```

## Система рівнів (однакова для всіх родин)

```
Tier 1 — subject alone on the pastel circle.
Tier 2 — subject plus one thin ring just inside the circle edge.
Tier 3 — subject plus a laurel wreath hugging the inside of the circle.
Tier 4 — subject plus laurel wreath plus short radiating rays behind the subject.
```

Рівень передає «наскільки це велике досягнення» без жодної цифри — тому в
картинках і не потрібен текст.

---

## Родина 1 — Постійність (вогонь)

Палітра: `circle #fef3c7, subject #78350f, highlight #f59e0b`

| id | Tier | Опис для моделі |
|---|---|---|
| `first` | 1 | A single flame rising from a small dumbbell, one spark above it. |
| `w10` | 2 | A flame inside a rounded shield. |
| `w25` | 3 | A flame inside a rounded shield, laurel wreath around it. |
| `w50` | 4 | A tall flame of three overlapping tongues inside a shield, laurel wreath and short rays. |
| `w100` | 4 | A tall flame inside a shield topped with a small crown, laurel wreath and long rays. |
| `s2` | 1 | A calendar page with a small flame burning on it. |
| `s4` | 2 | A calendar page with a flame, thin ring around it. |
| `s8` | 3 | A calendar page with a flame leaving a curved trail, laurel wreath. |
| `s12` | 4 | A calendar page with a strong flame and a curved trail, laurel wreath and rays. |
| `s26` | 4 | An arc of calendar pages curving around one large flame, laurel wreath and long rays. |

## Родина 2 — Рекорди (кубок і штанга)

Палітра: `circle #ede9fe, subject #5b21b6, highlight #8b5cf6`

| id | Tier | Опис для моделі |
|---|---|---|
| `pr1` | 1 | A small trophy cup with an upward arrow inside the bowl. |
| `pr10` | 2 | A trophy cup with an upward arrow, thin ring around it. |
| `pr25` | 4 | A tall ornate trophy cup with an upward arrow, laurel wreath and rays. |
| `lift60` | 1 | A straight barbell with one weight plate on each side. |
| `lift80` | 2 | A barbell with two weight plates on each side, the bar flexing slightly, thin ring. |
| `lift100` | 4 | A barbell with three weight plates on each side, the bar clearly bending, one small lightning bolt accent, laurel wreath and rays. |

## Родина 3 — Обсяг (диски й гора)

Палітра: `circle #dbeafe, subject #1e40af, highlight #3b82f6`

| id | Tier | Опис для моделі |
|---|---|---|
| `t10` | 1 | A neat stack of weight plates, viewed from the side. |
| `t50` | 2 | A taller stack of weight plates shaped like a small hill, thin ring. |
| `t100` | 4 | A mountain built out of stacked weight plates with a small flag on the peak, laurel wreath and rays. |
| `day5` | 1 | One calendar day square with a barbell lying across it and a single sweat drop. |
| `day10` | 3 | One calendar day square with a heavily loaded barbell across it and a lightning bolt, laurel wreath. |

## Родина 4 — Програма і різноманіття (тіло, календар, фініш)

Палітра: `circle #e0f2fe, subject #075985, highlight #0ea5e9`

| id | Tier | Опис для моделі |
|---|---|---|
| `ex10` | 1 | Three different pieces of equipment side by side: a dumbbell, a kettlebell and a resistance band. |
| `ex25` | 2 | A small rack holding five different pieces of equipment, thin ring. |
| `ex50` | 4 | A full equipment rack seen from the front, dumbbells and kettlebells in rows, laurel wreath and rays. |
| `groups4` | 2 | A simple front-facing human torso silhouette with four muscle zones highlighted in the accent colour, thin ring. |
| `groups6` | 4 | A full front-facing human silhouette with the whole body highlighted and glowing, laurel wreath and rays. |
| `weeks4` | 3 | A calendar month grid with four rows marked by checkmarks, laurel wreath. |
| `programDone` | 4 | A chequered finish flag crossed with a ribbon, a large checkmark in front, laurel wreath and rays. |

---

## Якщо модель збивається

- **Малює букви або цифри.** Додай у кінець: `No text. No numbers. No letters
  anywhere in the image.` У Midjourney — `--no text, letters, numbers, words`.
- **Стиль «попливе» від картинки до картинки.** Генеруй по одній, щоразу
  прикріплюючи еталон, і додавай `identical art style to the attached reference`.
- **Занадто дрібні деталі.** Додай: `bold simplified shapes, readable at 40px,
  minimum stroke width 12px at 1024px`.
- **Тіні й 3D.** Додай: `strictly flat, no shadows, no gradients, no 3D`.
- **Фон не прозорий.** Якщо модель не вміє в прозорість — попроси
  `plain white background`, потім виріж коло самому або скажи мені, я обріжу.

## Коли картинки будуть готові

Клади у `public/achievements/` під іменем id (`first.png`, `w10.png`, …, 512 або
1024 px, PNG). Скажи — і я підключу їх у застосунку замість поточних
lucide-іконок, з фолбеком: якщо файла для значка немає, малюється стара іконка,
тож можна заливати частинами.
