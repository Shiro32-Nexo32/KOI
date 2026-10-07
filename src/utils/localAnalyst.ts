import { PlayerProfile } from '../types/lol';

export function getLocalAnalystAnswer(question: string, players: PlayerProfile[]): string {
  const cleanQuery = question.toLowerCase().trim();

  if (cleanQuery.includes('reporte de los 5') || cleanQuery.includes('como van') || cleanQuery.includes('cómo van')) {
    return `Actualmente los cinco jugadores de MAD Lions KOI están en un momento excelente en el bootcamp de NA:

1. **Jojopyun** (\`${players.find((p) => p.id === 'jojopyun')?.riotId}\`): Diamante II 27 LP (8-0, 100% WR). Está volando con Sylas (16.0 KDA) y Viktor (11.0 KDA). Es el número 1 en forma del grupo.
2. **Alvaro** (\`${players.find((p) => p.id === 'alvaro')?.riotId}\`): Diamante I 97 LP (13-1, 92.9% WR). A una sola victoria de promocionar a Master.
3. **Supa** (\`${players.find((p) => p.id === 'supa')?.riotId}\`): Master 62 LP (15-2, 88.2% WR). Líder absoluto en el ladder con su Draven (7-2) y 10.1 CS/min.
4. **Elyoya** (\`${players.find((p) => p.id === 'elyoya')?.riotId}\`): Diamante I 57 LP (13-2, 86.7% WR). Gran volumen de juego y control de objetivos con Xin Zhao (4-0).
5. **Myrwn** (\`${players.find((p) => p.id === 'myrwn')?.riotId}\`): Diamante II 97 LP (11-2, 84.6% WR). A 3 LP de subir a Diamante I con Gwen (100% WR).

**Ranking de Forma:** Jojopyun > Alvaro > Supa > Elyoya > Myrwn
**Ranking de Elo:** Supa > Alvaro > Elyoya > Myrwn > Jojopyun`;
  }

  if (cleanQuery.includes('jojo') || cleanQuery.includes('jojopyun')) {
    const jojo = players.find((p) => p.id === 'jojopyun');
    if (!jojo) return 'Datos de Jojopyun no disponibles.';
    return `**Jojopyun** está en racha impecable: **${jojo.wins}-${jojo.losses} (${jojo.winrate}% Winrate)** en Diamante II (${jojo.lp} LP).
Ha jugado 5 campeones distintos en sus 8 partidas:
* **Sylas**: 2-0, con un descomunal KDA de 16.0
* **Viktor**: 2-0, KDA de 11.0 y 9.8 CS/min
* **Twisted Fate**: 1-0, KDA de 18.0
* **Ryze**: 2-0, KDA de 8.3
* **Jayce**: 1-0, KDA de 7.0
Es sin duda el jugador con el pico de rendimiento individual más alto del bootcamp ahora mismo.`;
  }

  if (cleanQuery.includes('supa')) {
    const supa = players.find((p) => p.id === 'supa');
    if (!supa) return 'Datos de Supa no disponibles.';
    return `**Supa** es el faro del ladder para el equipo:
* Rango: **${supa.tier} ${supa.division} ${supa.lp} LP** (el líder del equipo en Master)
* Balance: **${supa.wins}-${supa.losses} (${supa.winrate}% WR)**
* Farmeo medio: **${supa.avgCsPerMin} CS/min**
* Destaca especialmente su **Draven (7-2)** como pick identitario de presión, y mantiene un 100% de victorias con **Aphelios (4-0)** y **Kai'Sa (3-0)**.`;
  }

  if (cleanQuery.includes('alvaro') || cleanQuery.includes('álvaro')) {
    const alvaro = players.find((p) => p.id === 'alvaro');
    if (!alvaro) return 'Datos de Alvaro no disponibles.';
    return `**Alvaro** está intratable:
* Rango: **${alvaro.tier} ${alvaro.division} ${alvaro.lp} LP** (¡a tan solo 3 LP de entrar en Master!)
* Balance: **${alvaro.wins}-${alvaro.losses} (${alvaro.winrate}% WR)**
* KDA: **${alvaro.avgKda}** con una participación en muertes del ${alvaro.avgKillParticipationPct}%
* Su **Thresh** está invicto (4-0, 6.1 KDA) y ha aportado una gran versatilidad con picks como Camille soporte, Zoe, Elise y Alistar.`;
  }

  if (cleanQuery.includes('elyoya') || cleanQuery.includes('yoya')) {
    const yoya = players.find((p) => p.id === 'elyoya');
    if (!yoya) return 'Datos de Elyoya no disponibles.';
    return `**Elyoya** (\`${yoya.riotId}\`):
* Rango: **${yoya.tier} ${yoya.division} ${yoya.lp} LP**
* Balance: **${yoya.wins}-${yoya.losses} (${yoya.winrate}% WR)**
* KDA: **${yoya.avgKda}**
* Es el jugador con mayor volumen de partidas analizadas. Su **Xin Zhao** (4-0) y **Viego** (4-1) están marcando el ritmo de las partidas en NA, asegurando el control de objetivos clave.`;
  }

  if (cleanQuery.includes('myrwn')) {
    const myrwn = players.find((p) => p.id === 'myrwn');
    if (!myrwn) return 'Datos de Myrwn no disponibles.';
    return `**Myrwn** (\`${myrwn.riotId}\`):
* Rango: **${myrwn.tier} ${myrwn.division} ${myrwn.lp} LP** (a un paso de subir a Diamante I)
* Balance: **${myrwn.wins}-${myrwn.losses} (${myrwn.winrate}% WR)**
* KDA: **${myrwn.avgKda}** con ${myrwn.avgCsPerMin} CS/min
* Su **Gwen** está al 100% de victorias (4-0, 6.6 KDA) y su **Rumble** (3-1) aporta gran daño en peleas de equipo. Aunque arrancó más abajo en MMR, su ritmo de escalada es altísimo.`;
  }

  if (cleanQuery.includes('bot') || cleanQuery.includes('botlane') || cleanQuery.includes('duo')) {
    return `La botlane de MAD Lions KOI (Supa + Alvaro) está dominando las rankeds de NA de manera abrumadora:
* Balance combinado: **28 victorias y solo 3 derrotas** (>90% WR en el carril inferior).
* Supa está ya en **Master 62 LP** y Alvaro en **Diamante I 97 LP** a punto de unirse a él.
* La combinación de presión de Draven/Aphelios con el control de mapa de Thresh y Alistar está decantando casi todas las partidas antes del minuto 25.`;
  }

  if (cleanQuery.includes('kda') || cleanQuery.includes('mejor')) {
    return `El mejor KDA del equipo lo ostenta **Jojopyun con un promedio de 10.4 KDA**, seguido por **Alvaro (5.9)** y **Elyoya (5.8)**. En partidas individuales, Jojopyun llegó a registrar 19.0 KDA con Sylas y 18.0 con Twisted Fate.`;
  }

  return `Los 5 jugadores de MAD Lions KOI en el bootcamp de NA acumulan un impresionante balance global de ~89.5% de victorias. Jojopyun lidera la forma invicto con 8-0, mientras que Supa (Master 62 LP) y Alvaro (D1 97 LP) comandan el avance en el ladder. ¿Quieres profundizar en las estadísticas de algún jugador en específico?`;
}
