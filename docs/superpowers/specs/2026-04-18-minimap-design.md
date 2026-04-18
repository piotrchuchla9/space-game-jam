# Minimapa lokalna — design

## Cel
Dodać lokalną minimapę (radar) w HUD, pokazującą pozycję rakiety oraz znajdźki (gears, canisters, flames, shields) w jej okolicy. Pomaga graczowi planować zbieranie.

## Zakres (co jest)
- Radar lokalny w prawym górnym rogu, pod panelem FUEL.
- Pokazuje znajdźki: gear, canister (paliwo), flame (boost), shield.
- Rakieta zawsze widoczna, narysowana bliżej dołu radaru (75% wysokości od góry), żeby widzieć więcej tego, co przed nią.
- Orientacja stała: góra radaru = góra świata (bez rotacji).
- Małe ikony sprite'ów dla znajdźków (mini-wersje `gear`, `canister`, `flame`, `shield`).

## Zakres (czego NIE ma)
- Brak zagrożeń (birds, meteors, storms) na radarze.
- Brak stref (atmosfera/turbulencja/kosmos).
- Brak orientacji po kursie rakiety, brak zoom/toggle, brak przycisku.

## Architektura

Nowy komponent `Minimap` w `src/game/ui/Minimap.ts`, tworzony i aktualizowany przez `HUDScene`.

Przepływ danych:
1. `FlightScene.update()` pobiera snapshot znajdźków w zasięgu przez `ZoneManager.getMinimapItems(rocketX, rocketY, range)`.
2. `FlightScene` emituje zdarzenie `updateMinimap` z payloadem `{ rocketX, rocketY, items }`.
3. `HUDScene` nasłuchuje zdarzenia i wywołuje `minimap.update(...)`.

## Komponenty

### `Minimap` (`src/game/ui/Minimap.ts`)
- Konstruktor: `(scene, x, y, size)` — tworzy tło (półprzezroczysty ciemny prostokąt), ramkę oraz kontener na markery.
- `update(rocketX, rocketY, items: MinimapItem[])` — czyści markery, rysuje nowe w zasięgu, pozycjonuje marker rakiety.
- `destroy()` — sprząta obiekty graficzne.

### Typ `MinimapItem`
```ts
type MinimapItem = {
  x: number;
  y: number;
  type: 'gear' | 'canister' | 'flame' | 'shield';
};
```

### Parametry radaru
- Rozmiar: 140×140 px.
- Łączny zasięg świata widoczny na radarze: 2000 px × 2000 px (czyli ±1000 px od środka skali), skala = 140 / 2000 = 0.07 px HUD / px świata.
- Pozycja markera rakiety: 50% szerokości, 75% wysokości radaru (rakieta bliżej dołu).
- Z uwagi na offset rakiety (75% Y): widoczne ok. 1500 px nad rakietą i 500 px pod rakietą, oraz ±1000 px w bok.
- Pozycja HUD: x=614, y=130 (pod panelem FUEL w prawym górnym rogu).

### Rysowanie markerów
- Ikony to mini-wersje oryginalnych sprite'ów (`gear`, `canister`, `flame`, `shield`), skalowane do ~10–12 px wyświetlania.
- Pozycja markera: `mapX = radarCenterX + (item.x - rocketX) * scale`, analogicznie dla Y (z offsetem +25% wysokości żeby rakieta była niżej).
- Clipping: markery poza bbox radaru są pomijane.
- Rakieta rysowana jako mały trójkącik/kropka w ustalonej pozycji.

## Zmiany w istniejącym kodzie

### `ZoneManager`
Dodać publiczną metodę:
```ts
getMinimapItems(rocketX: number, rocketY: number, range: number): MinimapItem[]
```
Iteruje po `gears`, `canisters`, `flames`, `shields`, zwraca tylko te, których `|dx| <= range && |dy| <= range`. Zwraca wyłącznie `{x, y, type}` — bez body/graphic.

### `FlightScene.update()`
Po `zoneManager.update(...)` dodać:
```ts
const items = this.zoneManager.getMinimapItems(
  this.rocket.body.position.x,
  this.rocket.body.position.y,
  1000
);
this.events.emit('updateMinimap', {
  rocketX: this.rocket.body.position.x,
  rocketY: this.rocket.body.position.y,
  items,
});
```

### `HUDScene.create()`
- Utworzyć instancję `this.minimap = new Minimap(this, 614, 130, 140)`.
- Dodać listener na `updateMinimap`, wywołujący `minimap.update(...)`.
- W handlerze `shutdown` wyczyścić listener i zniszczyć `minimap`.

## Edge cases
- Crash/restart sceny: `Minimap.destroy()` w `HUDScene.shutdown`, listener odpinany analogicznie do istniejącego `updateHUD`.
- Brak znajdźków w zasięgu: radar pokazuje samą rakietę + tło, bez błędów.
- Znajdźki na brzegu: clipping ignoruje te poza bbox.
- Rakieta poniżej startu (y > 1100): radar działa identycznie, liczy względnie.

## Plan testów (manualnie)
- Start gry → radar widoczny w prawym górnym rogu pod FUEL.
- Lot w górę → ikony znajdźków pojawiają się od góry radaru, przesuwają w dół w miarę wznoszenia, znikają poza zasięgiem.
- Zebranie geara → ikona znika natychmiast (bo `ZoneManager` usuwa z listy przy `removeGearByBody`).
- Crash → radar znika razem z restartem HUD.

## Ryzyka / YAGNI
- Emisja `updateMinimap` co klatkę: przy zasięgu 2000 px i limicie spawnów koszt jest znikomy (kilkadziesiąt elementów max) — brak optymalizacji.
- Wszystkie rozszerzenia (zagrożenia, strefy, toggle, zoom) świadomie pominięte — można dodać później.
