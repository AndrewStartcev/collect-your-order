# ASSET MANIFEST — «Собери заказ!»

## Правило

Ассеты создаются отдельно и интегрируются в уже утверждённую геометрию. Не рисовать весь игровой экран одной картинкой.

Все растровые production assets: PNG с прозрачностью, без лишних полей. Названия файлов — lowercase kebab-case.

## Batch 01 — style validation

Цель: проверить стиль до производства полного набора.

### Environment

| ID | Файл | Размер | Примечание |
|---|---|---:|---|
| env-shelf-bay | `assets/environment/shelf-bay.png` | 224×448 | пустая секция металлического стеллажа, без товаров |
| env-shelf-header | `assets/environment/shelf-header.png` | 224×56 | тёмная верхняя панель категории, без текста |
| env-floor-strip | `assets/environment/floor-strip.png` | 512×128 | нижняя часть пола/основания склада, tileable по X |

### Character

| ID | Файл | Размер | Примечание |
|---|---|---:|---|
| worker-idle | `assets/character/worker-idle.png` | 96×128 | один основной pose |
| worker-pick | `assets/character/worker-pick.png` | 96×128 | берёт/сканирует товар |
| cart | `assets/character/cart.png` | 160×128 | пустая тележка |

### UI

| ID | Файл | Размер | Примечание |
|---|---|---:|---|
| ui-order-panel | `assets/ui/order-panel.png` | 350×750 | фон/рамка левой панели, без текста |
| ui-phone-frame | `assets/ui/phone-frame.png` | 360×750 | корпус телефона, центр должен быть пригоден под программный UI |
| ui-primary-button | `assets/ui/button-primary.png` | 300×72 | normal state, зелёная primary action |
| ui-primary-button-hover | `assets/ui/button-primary-hover.png` | 300×72 | hover |
| ui-primary-button-pressed | `assets/ui/button-primary-pressed.png` | 300×72 | pressed |
| ui-star | `assets/ui/icon-star.png` | 40×40 | рейтинг |
| ui-money | `assets/ui/icon-money.png` | 40×40 | деньги |
| ui-clock | `assets/ui/icon-clock.png` | 40×40 | таймер |
| ui-pause | `assets/ui/icon-pause.png` | 40×40 | пауза |

### Product test set

Каждый `64×64`, прозрачный фон.

1. `assets/products/milk-carton.png`
2. `assets/products/banana.png`
3. `assets/products/toilet-paper.png`
4. `assets/products/dumplings.png`
5. `assets/products/kefir.png`
6. `assets/products/apple.png`
7. `assets/products/chocolate.png`
8. `assets/products/dish-soap.png`
9. `assets/products/rice.png`
10. `assets/products/frozen-berries.png`
11. `assets/products/shampoo.png`
12. `assets/products/batteries.png`

## Batch 02 — full product set

После принятия Batch 01 довести набор до 36–48 товаров.

Master size для каждого товара: `64×64`.

Товары делаются не по одному запросу без контекста, а сериями по категории, чтобы сохранить свет, масштаб и стиль.

### Молочные
- milk-carton
- kefir
- yogurt
- sour-cream
- butter
- cheese

### Овощи и фрукты
- banana
- apple
- orange
- tomato
- cucumber
- carrot

### Бакалея
- rice
- buckwheat
- pasta
- flour
- sugar
- canned-food

### Снеки / сладкое
- chocolate
- cookies
- chips
- crackers
- candy
- coffee

### Бытовая химия / гигиена
- dish-soap
- shampoo
- soap
- toothpaste
- toilet-paper
- detergent

### Заморозка / прочее
- dumplings
- frozen-berries
- ice-cream
- frozen-vegetables
- batteries
- flashlight

## Batch 03 — UI completion

После интеграции первых production assets:

- secondary button states;
- review card frame;
- rank badge;
- progress bar frame/fill;
- category icons ×6;
- success/warning icons;
- small basket/chosen-item slot;
- tooltip / unavailable badge;
- 4 upgrade icons.

## Batch 04 — FX / polish

Только если программных эффектов недостаточно:

- sparkle 16×16;
- scan flash 32×32;
- coin/ruble 24×24;
- warning mark 24×24;
- success burst 48×48.

## Приёмка

Перед массовой отрисовкой Batch 02 обязательно проверить Batch 01 в живой игре на `1600×900` и `1366×768`.

Не принимать ассеты по отдельности только потому, что они красиво выглядят в полном размере. Главный критерий — читаемость и единый вид внутри реального gameplay layout.