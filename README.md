# AirPlay MVP

Plataforma "pantalla + celulares como controles" (estilo AirConsole), con Node + Socket.io.
Incluye un mini-juego de demo: **buzzer** (el primero que toca cuando aparece "¡AHORA!" gana).

## Correr en local

```bash
npm install
npm start
```

- Pantalla:  http://localhost:3000/
- Control:   http://localhost:3000/controller.html

## Probar con celulares reales (misma red WiFi)

1. Averiguá la IP de tu compu en la red local (ej: `192.168.0.15`).
2. Arrancá con esa IP en el QR:

```bash
PUBLIC_URL=http://192.168.0.15:3000 npm start
```

3. Abrí la pantalla en la compu/TV. Escaneá el QR (o entrá a esa IP en el cel y poné el código).

> El QR usa `PUBLIC_URL`. Sin esa variable, el QR apunta a una ruta relativa que sólo
> funciona si abrís el control en el mismo dispositivo.

## Cómo está armado

- **server.js** — Maneja salas en memoria. Cada pantalla crea una sala con código de 4 letras.
  Reenvía inputs (control → pantalla) y mensajes (pantalla → controles).
- **public/index.html** — La PANTALLA: lobby con código + QR + lista de jugadores, y el juego.
- **public/controller.html** — El CONTROL del celular: pantalla de unión + el buzzer.

## Eventos Socket.io (tu "mini-SDK")

| Evento              | Dirección          | Para qué |
|---------------------|--------------------|----------|
| `screen:create`     | pantalla → server  | crear sala |
| `screen:created`    | server → pantalla  | devuelve code, qr, joinUrl |
| `player:join`       | control → server   | unirse con {code, name} |
| `player:joined`     | server → control   | confirma + asigna color |
| `screen:players`    | server → pantalla  | lista actualizada de jugadores |
| `player:input`      | control → server   | input del jugador (acción libre) |
| `screen:input`      | server → pantalla  | input reenviado con datos del jugador |
| `screen:message`    | pantalla → server  | mensaje a un control o a todos |
| `controller:message`| server → control   | mensaje recibido en el control |

## Siguiente paso para que sea "plataforma" y no un juego

Para agregar más juegos sin tocar esta capa: definí cada juego como un par de
módulos (lógica de pantalla + lógica de control) que usen estos mismos eventos.
El servidor ya es agnóstico al juego — `player:input` lleva un payload libre.
