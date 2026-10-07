# LoL Bootcamp Tracker & Pro Analyst 🏆

Seguimiento analítico en tiempo real de jugadores profesionales de League of Legends durante bootcamps y SoloQ competitiva (MAD Lions KOI en Norteamérica: Myrwn, Elyoya, Jojopyun, Supa y Alvaro).

## 🚀 Características

- **Los 5 jugadores registrados de fábrica:**
  - Myrwn (`Shirin#ilmgf` · TOP)
  - Elyoya (`Yoyadeodo#tuki` · JUNGLE)
  - Jojopyun (`jojooooooooo#9999` · MID)
  - Supa (`Charmander#MKOI` · ADC)
  - Alvaro (`Treecko#MKOI` · SUPPORT)
- **Doble Ranking Táctico:**
  - *Ranking de Forma:* Momentum reciente puro, racha y KDA.
  - *Ranking de Elo:* Posición ladder en tiempo real (Master > Diamante I > Diamante II).
- **Últimas 20 Rankeds detalladas:**
  - KDA, CS/min, daño infligido, porcentaje de participación en muertes, objetos reales con Data Dragon CDN 15.5.1 y etiquetas de rendimiento (*MVP*, *Hypercarry*, *ACE*).
- **Evolución Temporal de LP (Snapshots):**
  - Historial secuencial de escalada (`D2 40 LP → D2 72 LP → D1 15 LP → D1 97 LP → Master 62 LP`).
- **Analista Táctico en Vivo:**
  - Generación de informes automáticos y chat interactivo para preguntas libres o reportes de sinergia de la botlane.
- **Riot Games API Server Proxy:**
  - Las credenciales nunca se exponen al navegador. Enrutamiento regional (`americas` / `na1`) con caché inteligente para respetar los rate limits.

---

## 🛠️ Instalación y ejecución local

1. **Clonar el repositorio:**
```bash
git clone https://github.com/TU_USUARIO/lol-bootcamp-tracker.git
cd lol-bootcamp-tracker
```

2. **Instalar dependencias:**
```bash
npm install
```

3. **Configurar variables de entorno:**
Copia `.env.example` a `.env`:
```bash
cp .env.example .env
```
*(Opcional: Si tienes una Riot API Key de [developer.riotgames.com](https://developer.riotgames.com), añádela en `RIOT_API_KEY`). Si la dejas vacía, la aplicación funciona de forma inmediata con la telemetría y snapshots verificados del bootcamp.*

4. **Arrancar en modo desarrollo:**
```bash
npm run dev
```
Abre en tu navegador: [http://localhost:3000](http://localhost:3000)

---

## 📦 Despliegue en producción

Para desplegar en servicios como **Render**, **Railway**, **Fly.io** o un VPS:

```bash
npm run build
npm start
```

---

## ⚖️ Aviso Legal de Riot Games

LoL Bootcamp Tracker isn't endorsed by Riot Games and doesn't reflect the views or opinions of Riot Games or anyone officially involved in producing or managing Riot Games properties. Riot Games, and all associated properties are trademarks or registered trademarks of Riot Games, Inc.
