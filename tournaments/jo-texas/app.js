/* WPI Junior Olympics Session 3 schedule tool — Release 7.54.6 */
const SHEET_ID='1kIm-60Tzm6flJwXQxT0YXcxIsqSYmUw3JzrU-rInRUg';
const APP_VERSION='7.54.6';
const SHOW_TEAM_LOGOS=false;
const DATASETS=[{"id":"10u-coed-championship","age":"10U","division":"Coed Championship","gid":"","gidAliases":[],"sheetName":"10U_COED_CHAMP_6","sheetNameAliases":["10U_COED_CHAMP_6"],"sourceStrategy":"sheet_name_primary","snapshotPath":"../../data/tournaments/raw/2026-jo-session-3/10u-coed-championship.csv","snapshotUpdatedAt":"2026-07-30T01:52:19Z","expectedScheduleGames":22,"officialUrl":"https://docs.google.com/spreadsheets/d/1kIm-60Tzm6flJwXQxT0YXcxIsqSYmUw3JzrU-rInRUg/edit?usp=sharing"},{"id":"12u-coed-championship","age":"12U","division":"Coed Championship","gid":"","gidAliases":[],"sheetName":"12U_COED_CHAMP 21 12+9 ","sheetNameAliases":["12U_COED_CHAMP 21 12+9 ","12U_COED_CHAMP 21 12+9"],"sourceStrategy":"sheet_name_primary","snapshotPath":"../../data/tournaments/raw/2026-jo-session-3/12u-coed-championship.csv","snapshotUpdatedAt":"2026-07-30T01:52:19Z","expectedScheduleGames":81,"officialUrl":"https://docs.google.com/spreadsheets/d/1kIm-60Tzm6flJwXQxT0YXcxIsqSYmUw3JzrU-rInRUg/edit?usp=sharing"},{"id":"14u-boys-championship","age":"14U","division":"Boys Championship","gid":"","gidAliases":[],"sheetName":"14U_M_CHAMP-26 teams DE auRR","sheetNameAliases":["14U_M_CHAMP-26 teams DE auRR"],"sourceStrategy":"sheet_name_primary","snapshotPath":"../../data/tournaments/raw/2026-jo-session-3/14u-boys-championship.csv","snapshotUpdatedAt":"2026-07-30T01:52:19Z","expectedScheduleGames":101,"officialUrl":"https://docs.google.com/spreadsheets/d/1kIm-60Tzm6flJwXQxT0YXcxIsqSYmUw3JzrU-rInRUg/edit?usp=sharing"},{"id":"14u-girls-championship","age":"14U","division":"Girls Championship","gid":"","gidAliases":[],"sheetName":"14U_F_CHAMP_7","sheetNameAliases":["14U_F_CHAMP_7"],"sourceStrategy":"sheet_name_primary","snapshotPath":"../../data/tournaments/raw/2026-jo-session-3/14u-girls-championship.csv","snapshotUpdatedAt":"2026-07-30T01:52:19Z","expectedScheduleGames":27,"officialUrl":"https://docs.google.com/spreadsheets/d/1kIm-60Tzm6flJwXQxT0YXcxIsqSYmUw3JzrU-rInRUg/edit?usp=sharing"},{"id":"16u-boys-championship","age":"16U","division":"Boys Championship","gid":"","gidAliases":[],"sheetName":"16U_M_Champ 25","sheetNameAliases":["16U_M_Champ 25"],"sourceStrategy":"sheet_name_primary","snapshotPath":"../../data/tournaments/raw/2026-jo-session-3/16u-boys-championship.csv","snapshotUpdatedAt":"2026-07-30T01:52:19Z","expectedScheduleGames":97,"officialUrl":"https://docs.google.com/spreadsheets/d/1kIm-60Tzm6flJwXQxT0YXcxIsqSYmUw3JzrU-rInRUg/edit?usp=sharing"},{"id":"16u-girls-championship","age":"16U","division":"Girls Championship","gid":"","gidAliases":[],"sheetName":"16U_F_Champ-12 teams","sheetNameAliases":["16U_F_Champ-12 teams"],"sourceStrategy":"sheet_name_primary","snapshotPath":"../../data/tournaments/raw/2026-jo-session-3/16u-girls-championship.csv","snapshotUpdatedAt":"2026-07-30T01:52:19Z","expectedScheduleGames":48,"officialUrl":"https://docs.google.com/spreadsheets/d/1kIm-60Tzm6flJwXQxT0YXcxIsqSYmUw3JzrU-rInRUg/edit?usp=sharing"},{"id":"18u-boys-championship","age":"18U","division":"Boys Championship","gid":"","gidAliases":[],"sheetName":"18U_M_CHAMP_NEW_23","sheetNameAliases":["18U_M_CHAMP_NEW_23"],"sourceStrategy":"sheet_name_primary","snapshotPath":"../../data/tournaments/raw/2026-jo-session-3/18u-boys-championship.csv","snapshotUpdatedAt":"2026-07-30T01:52:19Z","expectedScheduleGames":94,"officialUrl":"https://docs.google.com/spreadsheets/d/1kIm-60Tzm6flJwXQxT0YXcxIsqSYmUw3JzrU-rInRUg/edit?usp=sharing"},{"id":"18u-girls-championship","age":"18U","division":"Girls Championship","gid":"","gidAliases":[],"sheetName":"18U_F_CHAMP-18 teams","sheetNameAliases":["18U_F_CHAMP-18 teams"],"sourceStrategy":"sheet_name_primary","snapshotPath":"../../data/tournaments/raw/2026-jo-session-3/18u-girls-championship.csv","snapshotUpdatedAt":"2026-07-30T01:52:19Z","expectedScheduleGames":75,"officialUrl":"https://docs.google.com/spreadsheets/d/1kIm-60Tzm6flJwXQxT0YXcxIsqSYmUw3JzrU-rInRUg/edit?usp=sharing"}];
const EMBEDDED_SNAPSHOT_CSV={"10u-coed-championship":"Day 1,HOT! RESULTS,SUBMIT SCORES!,Quarter Lengths by Day,,,,,,,,,\n\"Thu, July 30\",,,5-5-5-5,,,,,,,,,\n,,,Seeds,,,,,,,,,\nA,,,,,Team Travels,,,,,,,\nA1(1)-PEGASUS,,,,,,,,,,,,\nA2(2)-ALAMO,,,,,,,,,,,,\nA3(3)-MAVERICKS,,,,,,,,,,,,\nA4(4)-ZILLA,,,,,,,,,,,,\nA5(5)-PAC,,,,,,,,,,,,\nA6(6)- PEGASUS RED,,,KAHUNA EVENTS,,,,,,,,,\n,,,BRACKET BREAKER PROGRAM,,,,,,,,,\n,,,CLICK HERE,,,,,,,<---points | scores--->,,\n,total points,,,,,,,,,A,,\n,0,,,,,,,,,A1(1)-PEGASUS,,\n,0,,,,,,,,,A2(2)-ALAMO,,\n,0,,,,,,,,,A3(3)-MAVERICKS,,\n,0,,,,,,,,,A4(4)-ZILLA,,\n,0,,,,,,,,,A5(5)-PAC,,\n,0,,,,,,,,,A6(6)- PEGASUS RED,,\n,,,,,,,,,,,,\n,,,,,,,,,,,,\n,,,GARLAND ISD 3,,,,,,,,10C,\nDate,Time,Type,Location,Gm #,White,S,Dark,S,W to #,L to #,GMID,X=recorded above\n30-Jul,10:00 AM,\"Bracket A1,A6\",GARLAND ISD 3,1,A1(1)-PEGASUS,,A6(6)- PEGASUS RED,,,,10C-001,\n30-Jul,10:50 AM,\"Bracket A2,A5\",GARLAND ISD 3,2,A2(2)-ALAMO,,A5(5)-PAC,,,,10C-002,\n30-Jul,11:40 AM,\"Bracket A3,A4\",GARLAND ISD 3,3,A3(3)-MAVERICKS,,A4(4)-ZILLA,,,,10C-003,\n,,,,,,,,,,,,\n30-Jul,1:20 PM,\"Bracket A1,A2\",GARLAND ISD 3,4,A1(1)-PEGASUS,,A2(2)-ALAMO,,,,10C-004,\n30-Jul,2:10 PM,\"Bracket A3,A6\",GARLAND ISD 3,5,A3(3)-MAVERICKS,,A6(6)- PEGASUS RED,,,,10C-005,\n30-Jul,3:00 PM,\"Bracket A4,A5\",GARLAND ISD 3,6,A4(4)-ZILLA,,A5(5)-PAC,,,,10C-006,\n,,,,,,,,,,,,\n,,,,,,,,,,,,\nDay 2,,,,,,,,,,,,\n\"Fri, July 31\",,,,,,,,,,,,\n,,,GARLAND ISD 3,,,,,,,,,\nDate,Time,Type,Location,Gm #,White,S,Dark,S,W to #,L to #,GMID,\n31-Jul,10:00 AM,\"Bracket A1,A5\",GARLAND ISD 3,7,A1(1)-PEGASUS,,A5(5)-PAC,,,,10C-007,\n31-Jul,10:50 AM,\"Bracket A2,A3\",GARLAND ISD 3,8,A2(2)-ALAMO,,A3(3)-MAVERICKS,,,,10C-008,\n31-Jul,11:40 AM,\"Bracket A4,A6\",GARLAND ISD 3,9,A4(4)-ZILLA,,A6(6)- PEGASUS RED,,,,10C-009,\n,,,,,,,,,,,,\n31-Jul,1:20 PM,\"Bracket A1,A3\",GARLAND ISD 3,10,A1(1)-PEGASUS,,A3(3)-MAVERICKS,,,,10C-010,\n31-Jul,2:10 PM,\"Bracket A2,A4\",GARLAND ISD 3,11,A2(2)-ALAMO,,A4(4)-ZILLA,,,,10C-011,\n31-Jul,3:00 PM,\"Bracket A5,A6\",GARLAND ISD 3,12,A5(5)-PAC,,A6(6)- PEGASUS RED,,,,10C-012,\n,,,,,,,,,,,,\nDay 3,,,,,,,,,,,,\n\"Sat, August 1\",,,,,,,,,,,,\n,,,GARLAND ISD 3,,,,,,,,pt,\nDate,Time,Type,Location,Gm #,White,S,Dark,S,W to #,L to #,GMID,\n1-Aug,10:00 AM,\"Bracket A1,A4\",GARLAND ISD 3,13,A1(1)-PEGASUS,,A4(4)-ZILLA,,,,10C-013,\n1-Aug,10:50 AM,\"Bracket A2,A6\",GARLAND ISD 3,14,A2(2)-ALAMO,,A6(6)- PEGASUS RED,,,,10C-014,\n1-Aug,11:40 AM,\"Bracket A3,A5\",GARLAND ISD 3,15,A3(3)-MAVERICKS,,A5(5)-PAC,,,,10C-015,\n,,,,,,,,,,,,\n1-Aug,1:20 PM,play to semi,GARLAND ISD 3,16,3rdA-,,6thA-,,19,20,10C-016,\n1-Aug,2:10 PM,play to semi,GARLAND ISD 3,17,4thA-,,5thA-,,18,20,10C-017,\n,,,,,,,,,,,,\nDay 4,,,,,,,,,,,,\n\"Sun, August 2\",,,,,,,,,,,,\n,,,GARLAND ISD 3,,,,,,,,,\nDate,Time,Type,Location,Gm #,White,S,Dark,S,W to #,L to #,GMID,\n2-Aug,7:30 AM,1-4 semi,GARLAND ISD 3,18,1stA-,,W#17,,22,21,10C-018,\n2-Aug,8:30 AM,1-4 semi,GARLAND ISD 3,19,2ndA-,,W#16,,22,21,10C-019,\n2-Aug,9:30 AM,5th,GARLAND ISD 3,20,L#17,,L#16,,5th,6th,10C-020,\n,,,,,,,,,,,,\n2-Aug,11:30 AM,3rd,GARLAND ISD 3,21,L#18,,L#19,,3rd,4th,10C-021,\n2-Aug,12:30 PM,1st,GARLAND ISD 3,22,W#18,,W#19,,1st,2nd,10C-022,\n,,,,,,,,,,,,\npt_Place,,,,,,,,,,,,\n1st,W#22,,,,,,,,,,,\n2nd,L#22,,,,,,,,,,,\n3rd,W#21,,,,,,,,,,,\n4th,L#21,,,,,,,,,,,\n5th,W#20,,,,,,,,,,,\n6th,L#20,,,,,,,,,,,","12u-coed-championship":"Day 1,HOT! RESULTS,SUBMIT SCORES!,Quarter Lengths by Day,,,,,,,,,,,\n\"Thu, July 30\",,,6-6-6-6,,,,,,,,,,,\n,,,Seeds,,,2 v 3,crosses,,,,,,,\nA RR,B RR,C RR,\"D 1/4,2/3, W L\",\"E 1/4,2/3, W L\",\"F 1/4,2/3, W L\",8,18,,,,,,,\nA1(1)-GLADIATORS,B1(2)-PEAK POLO,C1(3)-SLAP,D1(4)-HOUSTON HYDRA,E1(5)-RISE,F1(6)-ALAMO,7,16,,,,,,,\nA2(12)-KRAKEN SATX POSEIDON,B2(11)-STORM TYPHOONS,C2(10)-FLEET,D2(9)-SWIM RVA,E2(8)-808,F2(7)-TEAM ORLANDO,9,17,,,,,,,\nA3(13)-ZILLA,B3(14)-SOUTHLAKE,C3(15)-VIPER PIGEON BLUE,D3(16)-THUNDER,E3(17)-VIPER PIGEON RED,F3(18)-HOUSTON HYDRA WHITE,,,,,,,,,\n,,,D4(21)-PAC,E4(20)-KRAKEN SATX NEPTUNE,F4(19)-PEGASUS RED,,,,,,,,,\n,,,,,,,,,,,12C,,,\nABD,,,DALLAS JESUIT,,,,,,,,,,,\nDate,Time,Type,Location,Gm #,White,S,Dark,S,W to #,L to #,GMID,,,\n30-Jul,7:30 AM,Group D1/4,DALLAS JESUIT,1,D1(4)-HOUSTON HYDRA,,D4(21)-PAC,,20,18,12C-001,,,\n30-Jul,8:20 AM,Group D2/3,DALLAS JESUIT,3,D2(9)-SWIM RVA,,D3(16)-THUNDER,,20,18,12C-003,,,\n30-Jul,9:10 AM,\"Group RR A1,A3\",DALLAS JESUIT,5,A1(1)-GLADIATORS,,A3(13)-ZILLA,,,,12C-005,,,\n30-Jul,10:00 AM,\"Group RR B1,B3\",DALLAS JESUIT,7,B1(2)-PEAK POLO,,B3(14)-SOUTHLAKE,,,,12C-007,,,\n30-Jul,10:50 AM,\"Group RR C1,C3\",DALLAS JESUIT,9,C1(3)-SLAP,,C3(15)-VIPER PIGEON BLUE,,,,12C-009,,,\n30-Jul,11:40 AM,3rd/4thE,DALLAS JESUIT,10,L#E1/E4,,L#E2/E3,,24,au_M4,12C-010,,,\n30-Jul,12:30 PM,1st/2ndE,DALLAS JESUIT,12,W#E1/E4,,W#E2/E3,,pt_P2,23,12C-012,,,\n30-Jul,1:20 PM,\"Group RR A2,A3\",DALLAS JESUIT,11,A2(12)-KRAKEN SATX POSEIDON,,A3(13)-ZILLA,,,,12C-011,,,\n30-Jul,2:10 PM,\"Group RR B2,B3\",DALLAS JESUIT,13,B2(11)-STORM TYPHOONS,,B3(14)-SOUTHLAKE,,,,12C-013,,,\n30-Jul,3:00 PM,\"Group RR C2,C3\",DALLAS JESUIT,15,C2(10)-FLEET,,C3(15)-VIPER PIGEON BLUE,,,,12C-015,,,\n30-Jul,3:50 PM,\"Group RR A1,A2\",DALLAS JESUIT,17,A1(1)-GLADIATORS,,A2(12)-KRAKEN SATX POSEIDON,,,,12C-017,,,\n30-Jul,4:40 PM,\"Group RR B1,B2\",DALLAS JESUIT,19,B1(2)-PEAK POLO,,B2(11)-STORM TYPHOONS,,,,12C-019,,,\n30-Jul,5:30 PM,\"Group RR C1,C2\",DALLAS JESUIT,21,C1(3)-SLAP,,C2(10)-FLEET,,,,12C-021,,,\n,,,,,,,,,,,,,,\n,,,,,,,,,,,,,,\n,,,,,,,,,,,,,,\nCEF,,,LEWISVILLE ISD WESTSIDE 3,,,,,,,,,,,\nDate,Time,Type,Location,Gm #,White,S,Dark,S,W to #,L to #,GMID,,,\n30-Jul,7:30 AM,Group E1/4,LEWISVILLE ISD WESTSIDE 3,2,E1(5)-RISE,,E4(20)-KRAKEN SATX NEPTUNE,,12,10,12C-002,,,\n30-Jul,8:20 AM,Group E2/3,LEWISVILLE ISD WESTSIDE 3,4,E2(8)-808,,E3(17)-VIPER PIGEON RED,,12,10,12C-004,,,\n30-Jul,9:10 AM,Group F1/4,LEWISVILLE ISD WESTSIDE 3,6,F1(6)-ALAMO,,F4(19)-PEGASUS RED,,16,14,12C-006,,,\n30-Jul,10:00 AM,Group F2/3,LEWISVILLE ISD WESTSIDE 3,8,F2(7)-TEAM ORLANDO,,F3(18)-HOUSTON HYDRA WHITE,,16,14,12C-008,,,\n30-Jul,10:50 AM,3rd/4thD,LEWISVILLE ISD WESTSIDE 3,18,L#D1/D4,,L#D2/D3,,22,au_M5,12C-018,,,\n30-Jul,11:40 AM,1st/2ndD,LEWISVILLE ISD WESTSIDE 3,20,W#D1/D4,,W#D2/D3,,pt_P1,24,12C-020,,,\n30-Jul,12:30 PM,3rd/4thF,LEWISVILLE ISD WESTSIDE 3,14,L#F1/F4,,L#F2/F3,,23,au_N4,12C-014,,,\n30-Jul,1:20 PM,1st/2ndF,LEWISVILLE ISD WESTSIDE 3,16,W#F1/F4,,W#F2/F3,,pt_O2,22,12C-016,,,\n,,,,,,,,,,,,,,\n30-Jul,3:00 PM,2D v 3E cross,LEWISVILLE ISD WESTSIDE 3,24,2ndD,,3rdE,,pt_O3,au_M3,12C-024,,,\n30-Jul,3:50 PM,2E v 3F cross,LEWISVILLE ISD WESTSIDE 3,23,2ndE,,3rdF,,pt_N2,au_N3,12C-023,,,\n30-Jul,4:40 PM,2F v 3D cross,LEWISVILLE ISD WESTSIDE 3,22,2ndF,,3rdD,,pt_M2,au_M2,12C-022,,,\n,,,,,,,,,,,,,,\n,,,,,,,,,,,,,,\n,,,,,,,,,,,,,,\n,pt_M,pt_N,pt_O,pt_P,,,,,,,,,,\n1,pt_M1(1stA)-,pt_N1(1stB)-,pt_O1(1stC)-,pt_P1(1stD)(W20),1,2,3,4,,,,,,\n2,pt_M2(W22),pt_N2(W23),pt_O2(1stF)(W16),pt_P2(1stE)(W12),8,7,6,5,,,,,,\n3,pt_M3(2ndB)-,pt_N3(2ndC)-,pt_O3(W24),pt_P3(2ndA)-,9,10,11,12,,,,,,\n,,,,,,,,,,,,,,\n,Gold,,,,,,,,,,,,,\n,au_M,au_N,,,KAHUNA EVENTS,,,,,,,,,\n1,au_M1(3rdA)-,au_N1(3rdB)-,13,14,BRACKET BREAKER PROGRAM,,,,,,,,,\n2,au_M2(L22),au_N2(3rdC)-,16,15,CLICK HERE,,,,,,,,,\n3,au_M3(L24),au_N3(L23),17,18,,,,,,,,,,\n4,au_M4(4thE)(L10),au_N4(4thF)(L14),20,19,,,,,,,,,,\n5,au_M5(4thD)(L18),,21,,,,,,,,,,,\n,,,,,,,,,,,,,,\nDay 2,,,,,,,,,,,,,,\n\"Fri, July 31\",,,,,,,,,,,,,,\n,,,DALLAS JESUIT,,,,,,,,pt_,,,\nDate,Time,Type,Location,Gm #,White,S,Dark,S,W to #,L to #,GMID,,,\n31-Jul,7:30 AM,RR M2/M3,DALLAS JESUIT,25,pt_M2(W22),\u00a0,pt_M3(2ndB)-,,,,12C-025,,pt_RR M2/M3,\n31-Jul,8:20 AM,RR N2/N3,DALLAS JESUIT,27,pt_N2(W23),\u00a0,pt_N3(2ndC)-,,,,12C-027,,pt_RR N2/N3,\n31-Jul,9:10 AM,RR O2/O3,DALLAS JESUIT,29,pt_O2(1stF)(W16),\u00a0,pt_O3(W24),,,,12C-029,,pt_RR O2/O3,\n31-Jul,10:00 AM,RR P2/P3,DALLAS JESUIT,31,pt_P2(1stE)(W12),\u00a0,pt_P3(2ndA)-,,,,12C-031,,pt_RR P2/P3,\n31-Jul,10:50 AM,RR M1/M3,DALLAS JESUIT,33,pt_M1(1stA)-,\u00a0,pt_M3(2ndB)-,,,,12C-033,,pt_RR M1/M3,\n31-Jul,11:40 AM,RR N1/N3,DALLAS JESUIT,35,pt_N1(1stB)-,\u00a0,pt_N3(2ndC)-,,,,12C-035,,pt_RR N1/N3,\n31-Jul,12:30 PM,RR O1/O3,DALLAS JESUIT,37,pt_O1(1stC)-,\u00a0,pt_O3(W24),,,,12C-037,,pt_RR O1/O3,\n31-Jul,1:20 PM,RR P1/P3,DALLAS JESUIT,39,pt_P1(1stD)(W20),\u00a0,pt_P3(2ndA)-,,,,12C-039,,pt_RR P1/P3,\n31-Jul,2:10 PM,RR M1/M2,DALLAS JESUIT,41,pt_M1(1stA)-,\u00a0,pt_M2(W22),,,,12C-041,,pt_RR M1/M2,\n31-Jul,3:00 PM,RR N1/N2,DALLAS JESUIT,43,pt_N1(1stB)-,\u00a0,pt_N2(W23),,,,12C-043,,pt_RR N1/N2,\n,,,,,,,,,,,,,,\n31-Jul,4:40 PM,RR O1/O2,DALLAS JESUIT,45,pt_O1(1stC)-,\u00a0,pt_O2(1stF)(W16),,,,12C-045,,pt_RR O1/O2,\n31-Jul,5:30 PM,RR P1/P2,DALLAS JESUIT,47,pt_P1(1stD)(W20),\u00a0,pt_P2(1stE)(W12),,,,12C-047,,pt_RR P1/P2,\n,,,,,,,,,,,,,,\n,,,LEWISVILLE ISD WESTSIDE 3,,,,,,,,au_,,,\nDate,Time,Type,Location,Gm #,White,S,Dark,S,W to #,L to #,GMID,,,X=recorded below\n31-Jul,7:30 AM,RR M1/M3,LEWISVILLE ISD WESTSIDE 3,26,au_M1(3rdA)-,\u00a0,au_M3(L24),,,,12C-026,,au_RR M1/M3,\n31-Jul,8:20 AM,RR M2/M4,LEWISVILLE ISD WESTSIDE 3,28,au_M2(L22),\u00a0,au_M4(4thE)(L10),,,,12C-028,,au_RR M2/M4,\n31-Jul,9:10 AM,RR N1/N4,LEWISVILLE ISD WESTSIDE 3,30,au_N1(3rdB)-,\u00a0,au_N4(4thF)(L14),,,,12C-030,,au_RR N1/N4,\n31-Jul,10:00 AM,RR N2/N3,LEWISVILLE ISD WESTSIDE 3,32,au_N2(3rdC)-,\u00a0,au_N3(L23),,,,12C-032,,au_RR N2/N3,\n,,,,,,,,,,,,,,\n31-Jul,11:40 AM,RR M3/M5,LEWISVILLE ISD WESTSIDE 3,34,au_M3(L24),\u00a0,au_M5(4thD)(L18),,,,12C-034,,au_RR M3/M5,\n31-Jul,12:30 PM,RR M1/M4,LEWISVILLE ISD WESTSIDE 3,36,au_M1(3rdA)-,\u00a0,au_M4(4thE)(L10),,,,12C-036,,au_RR M1/M4,\n31-Jul,1:20 PM,RR N1/N3,LEWISVILLE ISD WESTSIDE 3,38,au_N1(3rdB)-,\u00a0,au_N3(L23),,,,12C-038,,au_RR N1/N3,\n31-Jul,2:10 PM,RR N2/N4,LEWISVILLE ISD WESTSIDE 3,40,au_N2(3rdC)-,\u00a0,au_N4(4thF)(L14),,,,12C-040,,au_RR N2/N4,\n31-Jul,3:00 PM,RR M2/M5,LEWISVILLE ISD WESTSIDE 3,42,au_M2(L22),\u00a0,au_M5(4thD)(L18),,,,12C-042,,au_RR M2/M5,\n,,,,,,,,,,,,,,\nDay 3,,,,,,,,,,,,,,\n\"Sat, August 1\",,,,,,,,,,,,,,\n,,,DALLAS JESUIT,,,,,,,,,,,\nDate,Time,Type,Location,Gm #,White,S,Dark,S,W to #,L to #,GMID,,,\n1-Aug,7:30 AM,5-8 v 9-12,DALLAS JESUIT,49,2nd pt_P-,,3rd pt_O-,,59,64,12C-049,,pt_5-8 v 9-12,\n1-Aug,8:20 AM,5-8 v 9-12,DALLAS JESUIT,51,2nd pt_M-,,3rd pt_N-,,59,64,12C-051,,pt_5-8 v 9-12,\n1-Aug,9:10 AM,5-8 v 9-12,DALLAS JESUIT,53,2nd pt_O-,,3rd pt_P-,,63,65,12C-053,,pt_5-8 v 9-12,\n1-Aug,10:00 AM,5-8 v 9-12,DALLAS JESUIT,55,2nd pt_N-,,3rd pt_M-,,63,65,12C-055,,pt_5-8 v 9-12,\n1-Aug,10:50 AM,1-2 v 3-4,DALLAS JESUIT,57,1st pt_N-,,1st pt_O-,,77,67,12C-057,,pt_1-2 v 3-4,\n1-Aug,11:40 AM,5-6 v 7-8,DALLAS JESUIT,59,W49,,W51,,67,79,12C-059,,pt_5-6 v 7-8,\n1-Aug,12:30 PM,1-2 v 3-4,DALLAS JESUIT,61,1st pt_M-,,1st pt_P-,,75,70,12C-061,,pt_1-2 v 3-4,\n1-Aug,1:20 PM,5-6 v 7-8,DALLAS JESUIT,63,W53,,W55,,69,79,12C-063,,pt_5-6 v 7-8,\n1-Aug,2:10 PM,9-12 semi,DALLAS JESUIT,64,L51,,L49,,73,71,12C-064,,pt_9-12 semi,\n1-Aug,3:00 PM,9-12 semi,DALLAS JESUIT,65,L55,,L53,,73,71,12C-065,,pt_9-12 semi,\n1-Aug,3:50 PM,qtr final,DALLAS JESUIT,67,L57,,W59,,75,81,12C-067,,pt_qtr final,\n1-Aug,4:40 PM,qtr final,DALLAS JESUIT,69,L61,,W63,,77,81,12C-069,,pt_qtr final,\n,,,,,,,,,,,,,,\n,,,LEWISVILLE ISD WESTSIDE 3,,,,,,,,,,,\nDate,Time,Type,Location,Gm #,White,S,Dark,S,W to #,L to #,GMID,,,\n1-Aug,7:30 AM,Group,LEWISVILLE ISD WESTSIDE 3,50,au_M5(4thD)(L18),,au_M4(4thE)(L10),,,,12C-050,,au_Group,\n1-Aug,8:30 AM,Group,LEWISVILLE ISD WESTSIDE 3,52,au_M3(L24),,au_M2(L22),,,,12C-052,,au_Group,\n1-Aug,9:30 AM,Group,LEWISVILLE ISD WESTSIDE 3,54,au_N1(3rdB)-,,au_N2(3rdC)-,,,,12C-054,,au_Group,\n1-Aug,10:30 AM,Group,LEWISVILLE ISD WESTSIDE 3,56,au_N4(4thF)(L14),,au_N3(L23),,,,12C-056,,au_Group,\n1-Aug,11:30 AM,Group,LEWISVILLE ISD WESTSIDE 3,58,au_M1(3rdA)-,,au_M5(4thD)(L18),,,,12C-058,,au_Group,\n1-Aug,12:30 PM,Group,LEWISVILLE ISD WESTSIDE 3,60,au_M4(4thE)(L10),,au_M3(L24),,,,12C-060,,au_Group,\n1-Aug,1:30 PM,Group,LEWISVILLE ISD WESTSIDE 3,62,au_M2(L22),,au_M1(3rdA)-,,,,12C-062,,au_Group,\n,,,,,,,,,,,,,,\n,,,,,,,,,,,,,,\n1-Aug,4:30 PM,Play to semi,LEWISVILLE ISD WESTSIDE 3,66,2nd au_M-,,3rd au_N-,,72,76,12C-066,,au_Play to semi,\n1-Aug,5:30 PM,Play to semi,LEWISVILLE ISD WESTSIDE 3,68,2nd au_N-,,3rd au_M-,,70,76,12C-068,,au_Play to semi,\n,,,,,,,,,,,,,,\nDay 4,,,,,,,,,,,,,,\n\"Sun, August 2\",,,,,,,,,,,,,,\n,,,LEWISVILLE ISD WESTSIDE 3,,,,,,,,,,,\nDate,Time,Type,Location,Gm #,White,S,Dark,S,W to #,L to #,GMID,,,\n2-Aug,7:30 AM,RR 7-9,LEWISVILLE ISD WESTSIDE 3,74,5th au_M-,,4th au_N-,,RR,RR,12C-074,,au_RR 7-9,\n2-Aug,8:30 AM,5th,LEWISVILLE ISD WESTSIDE 3,81,L67,,L69,,pt_5th,pt_6th,12C-081,,pt_5th,\n2-Aug,9:30 AM,7th,LEWISVILLE ISD WESTSIDE 3,79,L59,,L63,,pt_7th,pt_8th,12C-079,,pt_7th,\n2-Aug,10:30 AM,9th,LEWISVILLE ISD WESTSIDE 3,73,W64,,W65,,pt_9th,pt_10th,12C-073,,pt_9th,\n2-Aug,11:30 AM,5th,LEWISVILLE ISD WESTSIDE 3,76,L66,,L68,,au_5th,au_6th,12C-076,,au_5th,\n2-Aug,12:30 PM,RR 7-9,LEWISVILLE ISD WESTSIDE 3,82,4th au_M-,,4th au_N-,,RR,RR,12C-082,,au_RR 7-9,\n2-Aug,1:30 PM,11th,LEWISVILLE ISD WESTSIDE 3,71,L64,,L65,,pt_11th,pt_12th,12C-071,,pt_11th,\n,,,,,,,,,,,,,,\n,,,DALLAS JESUIT,,,,,,,,,,,\nDate,Time,Type,Location,Gm #,White,S,Dark,S,W to #,L to #,GMID,,,\n2-Aug,7:30 AM,semi,DALLAS JESUIT,70,1st au_M-,,W68,,80,78,12C-070,,au_semi,\n2-Aug,8:30 AM,semi,DALLAS JESUIT,72,1st au_N-,,W66,,80,78,12C-072,,au_semi,\n2-Aug,9:30 AM,semi,DALLAS JESUIT,75,W61,,W67,,84,83,12C-075,,pt_semi,\n2-Aug,10:30 AM,semi,DALLAS JESUIT,77,W57,,W69,,84,83,12C-077,,pt_semi,\n2-Aug,11:30 AM,1st,DALLAS JESUIT,80,W70,,W72,,au_1st,au_2nd,12C-080,,au_1st,\n2-Aug,12:30 PM,3rd,DALLAS JESUIT,83,L75,,L77,,pt_3rd,pt_4th,12C-083,,pt_3rd,\n2-Aug,1:30 PM,1st,DALLAS JESUIT,84,W75,,W77,,pt_1st,pt_2nd,12C-084,,pt_1st,\n2-Aug,2:30 PM,3rd,DALLAS JESUIT,78,L70,,L72,,au_3rd,au_4th,12C-078,,au_3rd,\n,,,,,,,,,,,,,,\npt_Place,,au_Place,,,,,,,,,,,,\n1st,W84,1st,W80,,,,,,,,,,,\n2nd,L84,2nd,L80,,,,,,,,,,,\n3rd,W83,3rd,W78,,,,,,,,,,,\n4th,L83,4th,L78,,,,,,,,,,,\n5th,W81,5th,W76,,,,,,,,,,,\n6th,L81,6th,L76,,,,,,,,,,,\n7th,W79,7th,,,,,,,,,,,,\n8th,L79,8th,,,,,,,,,,,,\n9th,W73,9th,,,,,,,,,,,,\n10th,L73,,,,,,,,,,,,,\n11th,W71,,,,KAHUNA EVENTS,,,,,,,,,\n12th,L71,,,,BRACKET BREAKER PROGRAM,,,,,,,,,\n,,,,,CLICK HERE,,,,,,,,,\n,,,,,,,<---points | scores--->,,,,,,,\n,,,,,,,Gold,,,,,,,\ntotal points,,,,,,,au_M,,,,,,,\n0,,,,,,,au_M1(3rdA)-,,,,,,,\n0,,,,,,,au_M2(L22),,,,,,,\n0,,,,,,,au_M3(L24),,,,,,,\n0,,,,,,,au_M4(4thE)(L10),,,,,,,\n0,,,,,,,au_M5(4thD)(L18),,,,,,,\n,,,,,,,,,,,,,,\n,,,,,Gold,,,,,,,,,\n,,,,,au_N,,,,,,,,,\n0,,,,,au_N1(3rdB)-,,,,,,,,,\n0,,,,,au_N2(3rdC)-,,,,,,,,,\n0,,,,,au_N3(L23),,,,,,,,,\n0,,,,,au_N4(4thF)(L14),,,,,,,,,","14u-boys-championship":"Day 1,HOT! RESULTS,SUBMIT SCORES!,Quarter Lengths by Day,,,,,,,,,,,,,,,,,,,,,\n\"Thu, July 30\",,,6-6-7-7,,,,,,,,,,,,,,,,,,,,,\n,,,Seeds,,,,,,,,,,,,,,,,,,,,,\nA,B,C,D,,KAHUNA EVENTS,,,,,,,,,,,,,,,,,,,\nA1(1)-GLADIATORS,B1(2)-TEAM ORLANDO,C1(3)-HOUSTON HYDRA,D1(4)-CHICAGO PARKS DISTRICT,,BRACKET BREAKER PROGRAM,,,,,,,,,,,,,,,,,,,\nA2(16)-VP HILL COUNTRY,B2(15)-NORTHEAST ELITE,C2(14)-WEST SUBURBAN,D2(13)-SIERRA NEVADA,,CLICK HERE,,,,,,,,,,,,,,,,,,,\nA3(17)-BCWP,B3(18)-VP HTOWN,C3(19)-Z TOWN,D3(20)-FLEET,,,,,,,,,,,,,,,,,,,,,\n,,,,,,,,,,,,,,,,,,,,,,,,\nE,F,G,H,,,,,,,,,,,,,,,,,,,,,\nE1(5)-ALAMO,F1(6)-NORCO,G1(7)-MIAMI WOLVERINES,H1(8)-ROCKY MOUNTAIN WARRIORS,,,,,,,,,,,,,,,,,,,,,\nE2(12)-SLAP,F2(11)-RISE,G2(10)-PEAK POLO,H2(9)-ORLANO THUNDER,,,,,,,,,,,,,,,,,,,,,\nE3(21)-DISTRICT BLOSSOMS,F3(22)-STORM MONSOONS,G3(23)-KRAKEN SATX,H3(24)-DAISY,,,,,,,,,,,,,,,,,,,,,\n,,G4(26)-PEGASUS RED,H4(25)-LONGHORN WHITE,,,,,,,,14B,,,,,,,,,,,,,\n,,,,,,,,,,,,,,,,,,,,,,,,\n,,,LEWISVILLE ISD EASTSIDE 1,,A B H,,,,,,,,,,,,,,,,,,,\nDate,Time,Type,Location,Gm #,White,S,Dark,S,W to #,L to #,GMID,,,,,,,,,,,,,\n30-Jul,7:30 AM,\"A bracket A1,A3\",LEWISVILLE ISD EASTSIDE 1,1,A1(1)-GLADIATORS,,A3(17)-BCWP,,,,14B-001,,,,,,,,,,,,,\n30-Jul,8:20 AM,\"B bracket B1,B3\",LEWISVILLE ISD EASTSIDE 1,2,B1(2)-TEAM ORLANDO,,B3(18)-VP HTOWN,,,,14B-002,,,,,,,,,,,,,\n30-Jul,9:10 AM,W/L H1/H4,LEWISVILLE ISD EASTSIDE 1,5,H1(8)-ROCKY MOUNTAIN WARRIORS,,H4(25)-LONGHORN WHITE,,25,21,14B-005,,,,,,,,,,,,,\n30-Jul,10:00 AM,W/L H2/H3,LEWISVILLE ISD EASTSIDE 1,9,H2(9)-ORLANO THUNDER,,H3(24)-DAISY,,25,21,14B-009,,,,,,,,,,,,,\n30-Jul,10:50 AM,\"A bracket A2,A3\",LEWISVILLE ISD EASTSIDE 1,13,A2(16)-VP HILL COUNTRY,,A3(17)-BCWP,,,,14B-013,,,,,,,,,,,,,\n30-Jul,11:40 AM,\"B bracket B2,B3\",LEWISVILLE ISD EASTSIDE 1,14,B2(15)-NORTHEAST ELITE,,B3(18)-VP HTOWN,,,,14B-014,,,,,,,,,,,,,\n30-Jul,12:30 PM,3rd/4thH,LEWISVILLE ISD EASTSIDE 1,21,L5,,L9,,41,P5,14B-021,,,,,,,,,,,,,\n30-Jul,1:20 PM,1st/2ndH,LEWISVILLE ISD EASTSIDE 1,25,W5,,W9,,J2,45,14B-025,,,,,,,,,,,,,\n30-Jul,2:10 PM,\"A bracket A1,A2\",LEWISVILLE ISD EASTSIDE 1,29,A1(1)-GLADIATORS,,A2(16)-VP HILL COUNTRY,,,,14B-029,,,,,,,,,,,,,\n30-Jul,3:00 PM,\"B bracket B1,B2\",LEWISVILLE ISD EASTSIDE 1,30,B1(2)-TEAM ORLANDO,,B2(15)-NORTHEAST ELITE,,,,14B-030,,,,,,,,,,,,,\n,,,,,,,,,,,,,,,,,,,,,,,,\n30-Jul,4:40 PM,2v3 cross W to top 16 2A/3H,LEWISVILLE ISD EASTSIDE 1,41,2ndA-,,W#21(3rd H),,K3,R4,14B-041,,,,,,,,,,,,,start 9:30am\n30-Jul,5:30 PM,2v3 cross W to top 16 2D/3E,LEWISVILLE ISD EASTSIDE 1,44,2ndD-,,3rdE-,,M3,R3,14B-044,,,,,,,,,,,,,\n30-Jul,6:20 PM,2v3 cross W to top 16 2B/3G,LEWISVILLE ISD EASTSIDE 1,42,2ndB-,,W#22(3rdG),,J3,P4,14B-042,,,,,,,,,,,,,\n,,,,,,,,,,,,,,,,,,,,,,,,\n,,,LEWISVILLE ISD EASTSIDE 2,,C F G,,,,,,,,,,,,,,,,,,,\nDate,Time,Type,Location,Gm #,White,S,Dark,S,W to #,L to #,GMID,,,,,,,,,,,,,\n30-Jul,7:30 AM,\"F bracket F1,F3\",LEWISVILLE ISD EASTSIDE 2,7,F1(6)-NORCO,,F3(22)-STORM MONSOONS,,,,14B-007,,,,,,,,,,,,,\n30-Jul,8:20 AM,W/L G1/G4,LEWISVILLE ISD EASTSIDE 2,6,G1(7)-MIAMI WOLVERINES,,G4(26)-PEGASUS RED,,26,22,14B-006,,,,,,,,,,,,,\n30-Jul,9:10 AM,W/L G2/G3,LEWISVILLE ISD EASTSIDE 2,10,G2(10)-PEAK POLO,,G3(23)-KRAKEN SATX,,26,22,14B-010,,,,,,,,,,,,,\n30-Jul,10:00 AM,\"F bracket F2,F3\",LEWISVILLE ISD EASTSIDE 2,11,F2(11)-RISE,,F3(22)-STORM MONSOONS,,,,14B-011,,,,,,,,,,,,,start 9:30am\n30-Jul,10:50 AM,3rd/4thG,LEWISVILLE ISD EASTSIDE 2,22,L6,,L10,,42,R5,14B-022,,,,,,,,,,,,,\n30-Jul,11:40 AM,1st/2ndG,LEWISVILLE ISD EASTSIDE 2,26,W6,,W10,,K2,46,14B-026,,,,,,,,,,,,,\n30-Jul,12:30 PM,\"F bracket F1,F2\",LEWISVILLE ISD EASTSIDE 2,27,F1(6)-NORCO,,F2(11)-RISE,,,,14B-027,,,,,,,,,,,,,\n,,,,,,,,,,,,,,,,,,,,,,,,\n,,,,,,,,,,,,,,,,,,,,,,,,\n30-Jul,3:00 PM,2v3 cross W to top 16 2C/3F,LEWISVILLE ISD EASTSIDE 2,43,2ndC-,,3rdF-,,N3,P3,14B-043,,,,,,,,,,,,,\n30-Jul,3:50 PM,2v3 cross W to top 16 3C/2F,LEWISVILLE ISD EASTSIDE 2,47,3rdC-,,2ndF-,,K4,R2,14B-047,,,,,,,,,,,,,\n30-Jul,4:40 PM,2v3 cross W to top 16 3A/2H,LEWISVILLE ISD EASTSIDE 2,45,3rdA-,,L#25(2nd H),,N4,P1,14B-045,,,,,,,,,,,,,start 9:30am\n30-Jul,5:30 PM,2v3 cross W to top 16 3D/2E,LEWISVILLE ISD EASTSIDE 2,48,3rdD-,,2ndE-,,J4,P2,14B-048,,,,,,,,,,,,,\n30-Jul,6:20 PM,2v3 cross W to top 16 3B/2G,LEWISVILLE ISD EASTSIDE 2,46,3rdB-,,L#26 (2ndG),,M4,R1,14B-046,,,,,,,,,,,,,\n,,,,,,,,,,,,,,,,,,,,,,,,\n,,,TWU,,C D E,,,,,,,,,,,,,,,,,,,\nDate,Time,Type,Location,Gm #,White,S,Dark,S,W to #,L to #,GMID,,,,,,,,,,,,,\n30-Jul,7:30 AM,\"C bracket C1,C3\",TWU,3,C1(3)-HOUSTON HYDRA,,C3(19)-Z TOWN,,,,14B-003,\"C bracket C1,C3\",,,,,,,,,,,,\n30-Jul,8:20 AM,\"D bracket D1,D3\",TWU,4,D1(4)-CHICAGO PARKS DISTRICT,,D3(20)-FLEET,,,,14B-004,\"D bracket D1,D3\",,,,,,,,,,,,\n30-Jul,9:10 AM,E bracket E2/E3,TWU,20,E2(12)-SLAP,,E3(21)-DISTRICT BLOSSOMS,,,,14B-020,E bracket E2/E3,,,,,,,,,,,,\n30-Jul,10:00 AM,\"C bracket C2,C3\",TWU,15,C2(14)-WEST SUBURBAN,,C3(19)-Z TOWN,,,,14B-015,\"C bracket C2,C3\",,,,,,,,,,,,\n30-Jul,10:50 AM,D bracket D2/D3,TWU,16,D2(13)-SIERRA NEVADA,,D3(20)-FLEET,,,,14B-016,D bracket D2/D3,,,,,,,,,,,,\n30-Jul,11:40 AM,\"E bracket E1,E3\",TWU,8,E1(5)-ALAMO,,E3(21)-DISTRICT BLOSSOMS,,,,14B-008,\"E bracket E1,E3\",,,,,,,,,,,,\n30-Jul,12:30 PM,\"C bracket C1,C2\",TWU,31,C1(3)-HOUSTON HYDRA,,C2(14)-WEST SUBURBAN,,,,14B-031,\"C bracket C1,C2\",,,,,,,,,,,,\n30-Jul,1:20 PM,\"D bracket D1,D2\",TWU,32,D1(4)-CHICAGO PARKS DISTRICT,,D2(13)-SIERRA NEVADA,,,,14B-032,\"D bracket D1,D2\",,,,,,,,,,,,\n30-Jul,2:10 PM,\"E bracket E1,E2\",TWU,28,E1(5)-ALAMO,,E2(12)-SLAP,,,,14B-028,\"E bracket E1,E2\",,,,,,,,,,,,\n,,,,,,,,,,,,,,,,,,,,,,,,\nDay 2,,,,,,,,,,,,,,,,,,,,,,,,\n\"Fri, July 31\",6 minute quarters,,,,,,,,,,,,,,,,,,,,,,,\n,Platinum 16 Teams,,,,,,,,,,,,,,,,,,,,,,,\n,J,K,M,N,,,,,,,,,,,,,,,,,,,,\n1,J1(1stA)-,K1(1stB)-,M1(1stC)-,N1(1stD)-,KAHUNA EVENTS,,,,,,,,,,,,,,,,,,,\n2,J2(1stH)(W#25),K2(1stG)(W#26),M2(1st F)-,N2(1stE)-,BRACKET BREAKER PROGRAM,,,,,,,,Five team:,Five team:,,,,,,,,,,\n3,J3(W#42)(B/G),K3(W#41)(A/H),M3(W#45)(D/E),N3(W#43)(C/F),CLICK HERE,,,,,,,,Day 2 P bracket:,Day 2 R bracket:,,,,,,,,,,\n,J4(W#48)(D/E),K4(W#47)(C/F),M4(W#46)(B/G),N4(W#45)(A/H),,,,,,,,,P1v3,R1v3,,,,,,,,,,\n,,,,,,,,,,,,,P2v4,R2v4,,,,,,,,,,\n,Gold 11 Teams,,,,,,,,,,,,,,,,,,,,,,,\n,P,R,,,,,,,,,,,P3v5,R3v5,,,,,,,,,,\n,P1(L#45)(A/H)(17),R1(L#46)(B/G)(18),17,18,,,,,,,,,P1v4,R1v4,,,,,,,,,,\n,P2(L#48)(D/E)(20),R2(L#47)(C/F)(19),20,19,,,,,,,,,,,,,,,,,,,,\n,P3(L#43)(C/F)(22),R3(L#44)(D/E)(21),21,22,,,,,,,,,,,,,,,,,,,,\n,P4(L#42)(B/G)(23),R4(L#41)(A/H)(24),23,24,,,,,,,,,P2v5,R2v5,,,,,,,,,,\n,P5(L#21)(4thH)(17),R5(L#22)(4thG)(26),25,26,,,,,,,,,,,,,,,,,,,,\n,,,,,,,,,,,pt_,,,,,,,,,,,,,\n,,,LEWISVILLE ISD EASTSIDE 1,,,,,,,,au_,,,,,,,,,,,,,\nDate,Time,Type,Location,Gm #,White,S,Dark,S,W to #,L to #,GMID,,,,,,,,,,,,,\n31-Jul,7:30 AM,W/L J1/J4,LEWISVILLE ISD EASTSIDE 1,49,J1(1stA)-,,J4(W#48)(D/E),,61,64,14B-049,pt_W/L J1/J4,,,,,,,,,,,,\n31-Jul,8:20 AM,W/L J2/J3,LEWISVILLE ISD EASTSIDE 1,52,J2(1stH)(W#25),,J3(W#42)(B/G),,61,64,14B-052,pt_W/L J2/J3,,,,to Garland,,,,,,,,\n31-Jul,9:10 AM,W/L N1/N4,LEWISVILLE ISD EASTSIDE 1,55,N1(1stD)-,,N4(W#45)(A/H),,67,70,14B-055,pt_W/L N1/N4,,,,to Garland,,,,,,,,\n31-Jul,10:00 AM,W/L N2/N3,LEWISVILLE ISD EASTSIDE 1,58,N2(1stE)-,,N3(W#43)(C/F),,67,70,14B-058,pt_W/L N2/N3,,,,,,,,,,,,\n31-Jul,10:50 AM,1/2 J,LEWISVILLE ISD EASTSIDE 1,61,W49,,W52,,S1,T2,14B-061,pt_1/2 J,,,,,,,,,,,,\n31-Jul,11:40 AM,3/4 J,LEWISVILLE ISD EASTSIDE 1,64,L49,,L52,,U3,V4,14B-064,pt_3/4 J,,,,,,,,,,,,\n31-Jul,12:30 PM,1/2 N,LEWISVILLE ISD EASTSIDE 1,67,W55,,W58,,S4,T1,14B-067,pt_1/2 N,,,,,,,,,,,,\n31-Jul,1:20 PM,3/4 N,LEWISVILLE ISD EASTSIDE 1,70,L55,,L58,,U4,V1,14B-070,pt_3/4 N,,,,,,,,,,,,\n,,,,,,,,,,,,,,,,,,,,,,,,\n,,,LEWISVILLE ISD EASTSIDE 2,,,,,,,,,,,,,,,,,,,,,\nDate,Time,Type,Location,Gm #,White,S,Dark,S,W to #,L to #,GMID,,,,,,,,,,,,,\n31-Jul,7:30 AM,W/L K1/K4,LEWISVILLE ISD EASTSIDE 2,50,K1(1stB)-,,K4(W#47)(C/F),,62,65,14B-050,pt_W/L K1/K4,,,,,,,,,,,,\n31-Jul,8:20 AM,W/L K2/K3,LEWISVILLE ISD EASTSIDE 2,53,K2(1stG)(W#26),,K3(W#41)(A/H),,62,65,14B-053,pt_W/L K2/K3,,,,,,,,,,,,\n31-Jul,9:10 AM,W/L M1/M4,LEWISVILLE ISD EASTSIDE 2,56,M1(1stC)-,,M4(W#46)(B/G),,68,71,14B-056,pt_W/L M1/M4,,,,,,,,,,,,\n31-Jul,10:00 AM,W/L M2/M3,LEWISVILLE ISD EASTSIDE 2,59,M2(1st F)-,,M3(W#45)(D/E),,68,71,14B-059,pt_W/L M2/M3,,,,,,,,,,,,\n31-Jul,10:50 AM,1st/2ndK,LEWISVILLE ISD EASTSIDE 2,62,W50,,W53,,S2,U2,14B-062,pt_1st/2ndK,,,,,,,,,,,,\n31-Jul,11:40 AM,3rd/4thK,LEWISVILLE ISD EASTSIDE 2,65,L50,,L53,,T3,V3,14B-065,pt_3rd/4thK,,,,,,,,,,,,\n31-Jul,12:30 PM,1st/2ndM,LEWISVILLE ISD EASTSIDE 2,68,W56,,W59,,S3,U1,14B-068,pt_1st/2ndM,,,,,,,,,,,,\n31-Jul,1:20 PM,3rd/4thM,LEWISVILLE ISD EASTSIDE 2,71,L56,,L59,,T4,V2,14B-071,pt_3rd/4thM,,,,,,,,,,,,\n,,,,,,,,,,,,,,,,,,,,,,,,\n,,,DENTON ISD,,,,,,,,,,,,,,,,,,,,,\nDate,Time,Type,Location,Gm #,White,S,Dark,S,W to #,L to #,GMID,,,,,,,,,,,,,\n31-Jul,7:30 AM,\"P bracket P1,P3\",DENTON ISD,63,P1(L#45)(A/H)(17),,P3(L#43)(C/F)(22),,RR,RR,14B-063,\"au_P bracket P1,P3\",,,,,,,,,,,,\n31-Jul,8:20 AM,\"P bracket P2,P4\",DENTON ISD,66,P2(L#48)(D/E)(20),,P4(L#42)(B/G)(23),,RR,RR,14B-066,\"au_P bracket P2,P4\",,,,,,,,,,,,\n31-Jul,9:10 AM,\"R bracket R1,R3\",DENTON ISD,51,R1(L#46)(B/G)(18),,R3(L#44)(D/E)(21),,RR,RR,14B-051,\"au_R bracket R1,R3\",,,,,,,,,,,,\n31-Jul,10:00 AM,\"R bracket R2,R4\",DENTON ISD,54,R2(L#47)(C/F)(19),,R4(L#41)(A/H)(24),,RR,RR,14B-054,\"au_R bracket R2,R4\",,,,,,,,,,,,\n31-Jul,10:50 AM,\"P bracket P2,P5\",DENTON ISD,74,P2(L#48)(D/E)(20),,P5(L#21)(4thH)(17),,RR,RR,14B-074,\"au_P bracket P2,P5\",,,,,,,,,,,,\n31-Jul,11:40 AM,\"R bracket R2,R5\",DENTON ISD,60,R2(L#47)(C/F)(19),,R5(L#22)(4thG)(26),,RR,RR,14B-060,\"au_R bracket R2,R5\",,,,,,,,,,,,\n31-Jul,12:30 PM,\"P bracket P1,P4\",DENTON ISD,72,P1(L#45)(A/H)(17),,P4(L#42)(B/G)(23),,RR,RR,14B-072,\"au_P bracket P1,P4\",,,,,,,,,,,,\n31-Jul,1:20 PM,\"P bracket P3,P5\",DENTON ISD,69,P3(L#43)(C/F)(22),,P5(L#21)(4thH)(17),,RR,RR,14B-069,\"au_P bracket P3,P5\",,,,,,,,,,,,\n31-Jul,2:10 PM,\"R bracket R1,R4\",DENTON ISD,78,R1(L#46)(B/G)(18),,R4(L#41)(A/H)(24),,RR,RR,14B-078,\"au_R bracket R1,R4\",,,,,,,,,,,,\n31-Jul,3:00 PM,\"R bracket R3,R5\",DENTON ISD,75,R3(L#44)(D/E)(21),,R5(L#22)(4thG)(26),,RR,RR,14B-075,\"au_R bracket R3,R5\",,,,,,,,,,,,\n,,,,,,,,,,,,,,,,,,,,,,,,\nPlatinum,,,,,,,,,,,,,,,,,,,,,,,,\nS,T,U,V,,,,,,,,,,,,,,,,,,,,,\nS1(W#61)(1st J),T1(L#67)(2ndN),U1(L#68)(2ndM),V1(L#70)(4thN),,,,,,,,,,,,,,,,,,,,,\nS2(W#62)(1st K),T2(L#61)(2ndJ),U2(L#62)(2ndK),V2(L#71)(4thM),,,,,,,,,,,,,,,,,,,,,\nS3(W#68)(1st M),T3(W#65)(3rdK),U3(W#64)(3rdJ),V3(L#65)(4thK),,,,,,,,,,,,,,,,,,,,,\nS4(W#67)(1st N),T4(W#71)(3rdM),U4(W#70)(3rdN),V4(L#64)(4thJ),,,,,,,,,,,,,,,,,,,,,\n,,,,,,,,,,,,,,,,,,,,,,,,\nDay 3,7 minute quarters,,,,,,,,,,,,,,,,,,,,,,,\n1-Aug,,,,,,,,,,,,,,,,,,,,,,,,\n,,,LEWISVILLE ISD EASTSIDE 1,,,,,,,,,,,,,,,,,,,,,\nDate,Time,Type,Location,Gm #,White,S,Dark,S,W to #,L to #,GMID,,,,,,,,,,,,,\n1-Aug,9:30 AM,\"Win to top 8, Lose to bottom 8\",LEWISVILLE ISD EASTSIDE 1,83,T1(L#67)(2ndN),,T4(W#71)(3rdM),,98,101,14B-083,\"pt_Win to top 8, Lose to bottom 8\",Day 3 P bracket:,Day 3 R bracket:,,,,,,,,,,\n1-Aug,10:30 AM,\"Win to top 8, Lose to bottom 8\",LEWISVILLE ISD EASTSIDE 1,86,T2(L#61)(2ndJ),,T3(W#65)(3rdK),,98,101,14B-086,\"pt_Win to top 8, Lose to bottom 8\",P4v5,R4v5,,,,,,,,,,\n1-Aug,11:30 AM,win to semis,LEWISVILLE ISD EASTSIDE 1,90,S1(W#61)(1st J),,S4(W#67)(1st N),,115,111,14B-090,pt_win to semis,,,,,,,,,,,,\n1-Aug,12:30 PM,13-16 RR,LEWISVILLE ISD EASTSIDE 1,93,V2(L#71)(4thM),,V3(L#65)(4thK),,RR,RR,14B-093,pt_13-16 RR,,,,,,,,,,,,\n1-Aug,1:30 PM,Lose to 7th,LEWISVILLE ISD EASTSIDE 1,98,W83,,W86,,110,119,14B-098,pt_Lose to 7th,P1v2,R1v2,,,,,,,,,,\n1-Aug,2:30 PM,9-12 semi,LEWISVILLE ISD EASTSIDE 1,101,L83,,L86,,124,125,14B-101,pt_9-12 semi,,,,,,,,,,,,\n1-Aug,3:30 PM,13-16 RR,LEWISVILLE ISD EASTSIDE 1,105,V2(L#71)(4thM),,V4(L#64)(4thJ),,RR,RR,14B-105,pt_13-16 RR,,,,,,,,,,,,\n1-Aug,4:30 PM,\"win to semis, Lose to 5th\",LEWISVILLE ISD EASTSIDE 1,110,L89,,W98,,115,118,14B-110,\"pt_win to semis, Lose to 5th\",,,,,,,,,,,,\n,,,,,,,,,,,,,,,,,,,,,,,,\n,,,LEWISVILLE ISD EASTSIDE 2,,,,,,,,,,,,,,,,,,,,,\nDate,Time,Type,Location,Gm #,White,S,Dark,S,W to #,L to #,GMID,,,,,,,,,,,,,\n1-Aug,9:30 AM,\"Win to top 8, Lose to bottom 8\",LEWISVILLE ISD EASTSIDE 2,84,U1(L#68)(2ndM),,U4(W#70)(3rdN),,99,102,14B-084,\"pt_Win to top 8, Lose to bottom 8\",,,,,,,,,,,,\n1-Aug,10:30 AM,\"Win to top 8, Lose to bottom 8\",LEWISVILLE ISD EASTSIDE 2,87,U2(L#62)(2ndK),,U3(W#64)(3rdJ),,99,102,14B-087,\"pt_Win to top 8, Lose to bottom 8\",,,,,,,,,,,,\n1-Aug,11:30 AM,win to semis,LEWISVILLE ISD EASTSIDE 2,89,S2(W#62)(1st K),,S3(W#68)(1st M),,116,110,14B-089,pt_win to semis,P2v3,R2v3,,,,,,,,,,\n1-Aug,12:30 PM,13-16 RR,LEWISVILLE ISD EASTSIDE 2,104,V1(L#70)(4thN),,V4(L#64)(4thJ),,RR,RR,14B-104,pt_13-16 RR,,,,,,,,,,,,\n1-Aug,1:30 PM,Lose to 7th,LEWISVILLE ISD EASTSIDE 2,99,W84,,W87,,111,119,14B-099,pt_Lose to 7th,,,,,,,,,,,,\n1-Aug,2:30 PM,9-12 semi,LEWISVILLE ISD EASTSIDE 2,102,L84,,L87,,124,125,14B-102,pt_9-12 semi,,,,,,,,,,,,\n1-Aug,3:30 PM,13-16 RR,LEWISVILLE ISD EASTSIDE 2,92,V1(L#70)(4thN),,V3(L#65)(4thK),,RR,RR,14B-092,pt_13-16 RR,,,,,,,,,,,,\n1-Aug,4:30 PM,\"win to semis, Lose to 5th\",LEWISVILLE ISD EASTSIDE 2,111,L90,,W99,,116,118,14B-111,\"pt_win to semis, Lose to 5th\",,,,,,,,,,,,\n,,,,,,,,,,,,,,,,,,,,,,,,\n,,,SMU 1,,,,,,,,,,,,,,,,,,,,,\nDate,Time,Type,Location,Gm #,White,S,Dark,S,W to #,L to #,GMID,,,,,,,,,,,,,\n1-Aug,7:30 AM,\"R bracket R2,R3\",SMU 1,85,R2(L#47)(C/F)(19),,R3(L#44)(D/E)(21),,RR,RR,14B-085,\"au_R bracket R2,R3\",P1v5,R1v5,,,,,,,,,,\n1-Aug,8:30 AM,\"R bracket R1,R5\",SMU 1,88,R1(L#46)(B/G)(18),,R5(L#22)(4thG)(26),,RR,RR,14B-088,\"au_R bracket R1,R5\",P3v4,R3v4,,,,,,,,,,\n,,,,,,,,,,,,,,,,,,,,,,,,\n1-Aug,12:30 PM,\"R bracket R1,R2\",SMU 1,113,R1(L#46)(B/G)(18),,R2(L#47)(C/F)(19),,RR,RR,14B-113,\"au_R bracket R1,R2\",,,,,,,,,,,,\n1-Aug,1:30 PM,\"R bracket R3,R4\",SMU 1,112,R3(L#44)(D/E)(21),,R4(L#41)(A/H)(24),,RR,RR,14B-112,\"au_R bracket R3,R4\",,,,,,,,,,,,\n,,,,,,,,,,,,,,,,,,,,,,,,\n1-Aug,3:30 PM,\"R bracket R4,R5\",SMU 1,109,R4(L#41)(A/H)(24),,R5(L#22)(4thG)(26),,RR,RR,14B-109,\"au_R bracket R4,R5\",,,,,,,,,,,,\n,,,,,,,,,,,,,,,,,,,,,,,,\n,,,SMU 2,,,,,,,,,,,,,,,,,,,,,\nDate,Time,Type,Location,Gm #,White,S,Dark,S,W to #,L to #,GMID,,,,,,,,,,,,,\n1-Aug,7:30 AM,\"P bracket P2,P3\",SMU 2,94,P2(L#48)(D/E)(20),,P3(L#43)(C/F)(22),,RR,RR,14B-094,\"au_P bracket P2,P3\",,,,,,,,,,,,\n1-Aug,8:30 AM,\"P bracket P1,P5\",SMU 2,100,P1(L#45)(A/H)(17),,P5(L#21)(4thH)(17),,RR,RR,14B-100,\"au_P bracket P1,P5\",,,,,,,,,,,,\n,,,,,,,,,,,,,,,,,,,,,,,,\n1-Aug,12:30 PM,\"P bracket P4,P5\",SMU 2,91,P4(L#42)(B/G)(23),,P5(L#21)(4thH)(17),,RR,RR,14B-091,\"au_P bracket P4,P5\",,,,,,,,,,,,\n1-Aug,1:30 PM,\"P bracket P1,P2\",SMU 2,114,P1(L#45)(A/H)(17),,P2(L#48)(D/E)(20),,RR,RR,14B-114,\"au_P bracket P1,P2\",,,,,,,,,,,,\n,,,,,,,,,,,,,,,,,,,,,,,,\n1-Aug,3:30 PM,\"P bracket P3,P4\",SMU 2,106,P3(L#43)(C/F)(22),,P4(L#42)(B/G)(23),,RR,RR,14B-106,\"au_P bracket P3,P4\",,,,,,,,,,,,\n,,,,,,,,,,,,,,,,,,,,,,,,\nW 1st-10th,X 1st-10th,,,,,,,,,,,,,,,,,,,,,,,\nW1(1stP)-,X1(1stR)-,,,,,,,,,,,,,,,,,,,,,,,\nW2(2ndP)-,X2(2ndR)-,,,,,,,,,,,,,,,,,,,,,,,\nW3(3rdP)-,X3(3rdR)-,,,,,,,,,,,,,,,,,,,,,,,\nW4(4thP)-,X4(4thR)-,,,,,,,,,,,,,,,,,,,,,,,\nW5(5thP)-,X5(5thR)-,,,,,,,,,,,,,,,,,,,,,,,\n,,,,,,,,,,,,,,,,,,,,,,,,\nDay 4,,,,,,,,,,,,,,,,,,,,,,,,\n2-Aug,7 minute quarters,,,,,,,,,,,,,,,,,,,,,,,\n,,,LEWISVILLE ISD EASTSIDE 1,,,,,,,,,,,,,,,,,,,,,\nDate,Time,Type,Location,Gm #,White,S,Dark,S,W to #,L to #,GMID,,,,,,,,,,,,,\n2-Aug,8:30 AM,Semi,LEWISVILLE ISD EASTSIDE 1,115,W90,,W110,,127,129,14B-115,pt_Semi,,,,,,,,,,,,\n2-Aug,9:30 AM,3rd,LEWISVILLE ISD EASTSIDE 1,128,W2(2ndP)-,,X2(2ndR)-,,3rd,4th,14B-128,au_3rd,,,,,,,,,,,,\n2-Aug,10:30 AM,1st,LEWISVILLE ISD EASTSIDE 1,130,W1(1stP)-,,X1(1stR)-,,1st,2nd,14B-130,au_1st,,,,,,,,,,,,\n2-Aug,11:30 AM,5th,LEWISVILLE ISD EASTSIDE 1,123,W3(3rdP)-,,X3(3rdR)-,,5th,6th,14B-123,au_5th,,,,,,,,,,,,\n2-Aug,12:30 PM,7th,LEWISVILLE ISD EASTSIDE 1,120,W4(4thP)-,,X4(4thR)-,,7th,8th,14B-120,au_7th,,,,,,,,,,,,\n2-Aug,1:30 PM,9th,LEWISVILLE ISD EASTSIDE 1,117,W5(5thP)-,,X5(5thR)-,,9th,10th,14B-117,au_9th,,,,,,,,,,,,\n,,,,,,,,,,,,,,,,,,,,,,,,\n,,,LEWISVILLE ISD EASTSIDE 2,,,,,,,,,,,,,,,,,,,,,\nDate,Time,Type,Location,Gm #,White,S,Dark,S,W to #,L to #,GMID,,,,,,,,,,,,,\n2-Aug,8:30 AM,Semi,LEWISVILLE ISD EASTSIDE 2,116,W89,,W111,,127,129,14B-116,pt_Semi,,,,,,,,,,,,\n2-Aug,9:30 AM,5th place,LEWISVILLE ISD EASTSIDE 2,118,L110,,L111,,5th,6th,14B-118,pt_5th place,,,,,,,,,,,,\n2-Aug,10:30 AM,7th place,LEWISVILLE ISD EASTSIDE 2,119,L98,,L99,,7th,8th,14B-119,pt_7th place,,,,,,,,,,,,\n2-Aug,11:30 AM,9th place,LEWISVILLE ISD EASTSIDE 2,124,W101,,W102,,9th,10th,14B-124,pt_9th place,,,,,,,,,,,,\n2-Aug,12:30 PM,11th place,LEWISVILLE ISD EASTSIDE 2,125,L101,,L102,,11th,12th,14B-125,pt_11th place,,,,,,,,,,,,\n2-Aug,1:30 PM,13-16 RR,LEWISVILLE ISD EASTSIDE 2,121,V1(L#70)(4thN),,V2(L#71)(4thM),,RR,RR,14B-121,pt_13-16 RR,,,,,,,,,,,,\n2-Aug,2:30 PM,13-16 RR,LEWISVILLE ISD EASTSIDE 2,122,V3(L#65)(4thK),,V4(L#64)(4thJ),,RR,RR,14B-122,pt_13-16 RR,,,,,,,,,,,,\n,,,,,,,,,,,,,,,,,,,,,,,,\n,,,GARLAND ISD 2,,,,,,,,,,,,,,,,,,,,,\nDate,Time,Type,Location,Gm #,White,S,Dark,S,W to #,L to #,GMID,,,,,,,,,,,,,\n2-Aug,12:30 PM,3rd,GARLAND ISD 2,129,L115,,L116,,3rd,4th,14B-129,pt_3rd,,,,,,,,,,,,\n,,,,,,,,,,,,,,,,,,,,,,,,\n,,,,,,,,,,,,,,,,,,,,,,,,\nDate,Time,Type,Location,Gm #,White,S,Dark,S,W to #,L to #,GMID,,,,,,,,,,,,,\n2-Aug,12:30 PM,1st,GARLAND ISD 1,127,W115,,W116,,1st,2nd,14B-127,pt_1st,,,,,,,,,,,,\n,,,,,,,,,,,,,,,,,,,,,,,,\n,,,,,,,,,,,,,,,,,,,,,,,,\npt_Place,,au_Place,W130,,,,,,,,,,,,,,,,,,,,,\n1st,W127,1st,L130,,,,,,,,,,,,,,,,,,,,,\n2nd,L127,2nd,W128,,,,,,,,,,,,,,,,,,,,,\n3rd,W129,3rd,L128,,,,,,,,,,,,,,,,,,,,,\n4th,L129,4th,W123,,,,,,,,,,,,,,,,,,,,,\n5th,W118,5th,L123,,,,,,,,,,,,,,,,,,,,,\n6th,L118,6th,W120,,,,,,,,,,,,,,,,,,,,,\n7th,W119,7th,L120,,,,,,,,,,,,,,,,,,,,,\n8th,L119,8th,W117,,,,,,,,,,,,,,,,,,,,,\n9th,W124,9th,L117,,,,,,,,,,,,,,,,,,,,,\n10th,L124,10th,,,,,,,,,,,,,,,,,,,,,,\n11th,W125,,,,,,,,,,,,,,,,,,,,,,,\n12th,L125,,,,,,,,,,,,,,,,,,,,,,,\n13th,,,,,,,,,,,,,,,,,,,,,,,,\n14th,,,,,,,,,,,,,,,,,,,,,,,,\n15th,,,,,,,,,,,,,,,,,,,,,,,,\n16th,,,,,,,,,,,,,,,,,,,,,,,,","14u-girls-championship":"Day 1,HOT! RESULTS,SUBMIT SCORES!,Quarter Lengths by Day,,,,,,,,,\n\"Thu, July 30\",,,6-6-7-7,,,,,,,,,\n,,,Seeds,,,,,,,,,\nA,,,,,Team Travels,,,,,,,\nA1(1)-VIPER PIGEON,,,,,,,,,,,,\nA2(2)-RISE,,,,,,,,,,,,\nA3(3)-ST LOUIS LIONS,,,,,,,,,,,,\nA4(4)-ORLANDO THUNDER,,,,,,,,,,,,\nA5(5)-PEGASUS,,,,,,,,,,,,\nA6(6)-HOUSTON HYDRA,,,KAHUNA EVENTS,,,,,,,,,\nA7(7)-KRAKEN SATX,,,BRACKET BREAKER PROGRAM,,,,,,,,,\n,,,CLICK HERE,,,,,,,<---points | scores--->,,\n,total points,,,,,,,,,A,,\n,0,,,,,,,,,A1(1)-VIPER PIGEON,,\n,0,,,,,,,,,A2(2)-RISE,,\n,0,,,,,,,,,A3(3)-ST LOUIS LIONS,,\n,0,,,,,,,,,A4(4)-ORLANDO THUNDER,,\n,0,,,,,,,,,A5(5)-PEGASUS,,\n,0,,,,,,,,,A6(6)-HOUSTON HYDRA,,\n,0,,,,,,,,,A7(7)-KRAKEN SATX,,\n,,,,,,,,,,,,\n,,,SMU 1,,,,,,,,14G,\nDate,Time,Type,Location,Gm #,White,S,Dark,S,W to #,L to #,GMID,X=recorded above\n30-Jul,9:10 AM,\"Group A1,A7\",SMU 1,1,A1(1)-VIPER PIGEON,,A7(7)-KRAKEN SATX,,,,14G-001,\n30-Jul,10:00 AM,\"Group A2,A6\",SMU 1,2,A2(2)-RISE,,A6(6)-HOUSTON HYDRA,,,,14G-002,\n30-Jul,10:50 AM,\"Group A3,A5\",SMU 1,3,A3(3)-ST LOUIS LIONS,,A5(5)-PEGASUS,,,,14G-003,\n30-Jul,11:40 AM,\"Group A1,A4\",SMU 1,4,A1(1)-VIPER PIGEON,,A4(4)-ORLANDO THUNDER,,,,14G-004,\n30-Jul,12:30 PM,\"Group A2,A7\",SMU 1,5,A2(2)-RISE,,A7(7)-KRAKEN SATX,,,,14G-005,\n30-Jul,1:20 PM,\"Group A3,A6\",SMU 1,6,A3(3)-ST LOUIS LIONS,,A6(6)-HOUSTON HYDRA,,,,14G-006,\n30-Jul,2:10 PM,\"Group A4,A5\",SMU 1,7,A4(4)-ORLANDO THUNDER,,A5(5)-PEGASUS,,,,14G-007,\n,,,,,,,,,,,,\n,,,,,,,,,,,,\nDay 2,,,,,,,,,,,,\n\"Fri, July 31\",,,,,,,,,,,,\n,,,TWU,,,,,,,,,\nDate,Time,Type,Location,Gm #,White,S,Dark,S,W to #,L to #,GMID,\n31-Jul,9:00 AM,\"Group A1,A2\",TWU,8,A1(1)-VIPER PIGEON,,A2(2)-RISE,,,,14G-008,\n31-Jul,9:50 AM,\"Group A3,A7\",TWU,9,A3(3)-ST LOUIS LIONS,,A7(7)-KRAKEN SATX,,,,14G-009,\n31-Jul,10:40 AM,\"Group A4,A6\",TWU,10,A4(4)-ORLANDO THUNDER,,A6(6)-HOUSTON HYDRA,,,,14G-010,\n31-Jul,11:30 AM,\"Group A1,A5\",TWU,11,A1(1)-VIPER PIGEON,,A5(5)-PEGASUS,,,,14G-011,\n31-Jul,12:20 PM,\"Group A2,A3\",TWU,12,A2(2)-RISE,,A3(3)-ST LOUIS LIONS,,,,14G-012,\n31-Jul,1:10 PM,\"Group A4,A7\",TWU,13,A4(4)-ORLANDO THUNDER,,A7(7)-KRAKEN SATX,,,,14G-013,\n31-Jul,2:00 PM,\"Group A5,A6\",TWU,14,A5(5)-PEGASUS,,A6(6)-HOUSTON HYDRA,,,,14G-014,\n,,,,,,,,,,,,\nDay 3,,,,,,,,,,,,\n\"Sat, August 1\",,,,,,,,,,,,\n,,,TWU,,,,,,,,pt,\nDate,Time,Type,Location,Gm #,White,S,Dark,S,W to #,L to #,GMID,\n1-Aug,9:00 AM,\"Group A1,A3\",TWU,15,A1(1)-VIPER PIGEON,,A3(3)-ST LOUIS LIONS,,,,14G-015,\n1-Aug,10:00 AM,\"Group A5,A7\",TWU,16,A5(5)-PEGASUS,,A7(7)-KRAKEN SATX,,,,14G-016,\n1-Aug,11:00 AM,\"Group A2,A4\",TWU,17,A2(2)-RISE,,A4(4)-ORLANDO THUNDER,,,,14G-017,\n1-Aug,12:00 PM,\"Group A1,A6\",TWU,18,A1(1)-VIPER PIGEON,,A6(6)-HOUSTON HYDRA,,,,14G-018,\n1-Aug,1:00 PM,\"Group A2,A5\",TWU,19,A2(2)-RISE,,A5(5)-PEGASUS,,,,14G-019,\n1-Aug,2:00 PM,\"Group A3,A4\",TWU,20,A3(3)-ST LOUIS LIONS,,A4(4)-ORLANDO THUNDER,,,,14G-020,\n1-Aug,3:00 PM,\"Group A6,A7\",TWU,21,A6(6)-HOUSTON HYDRA,,A7(7)-KRAKEN SATX,,,,14G-021,\n,,,,,,,,,,,,\nDay 4,,,,,,,,,,,,\n\"Sun, August 2\",,,,,,,,,,,,\n,,,CARROL ISD 2,,,,,,,,,\nDate,Time,Type,Location,Gm #,White,S,Dark,S,W to #,L to #,GMID,\n2-Aug,10:00 AM,\"7th, play to 5th\",CARROL ISD 2,22,6thA-,,7thA-,,25,7th,14G-022,\n,,,,,,,,,,,,\n2-Aug,1:00 PM,5th,CARROL ISD 2,25,5thA-,,W22,,5th,6th,14G-025,\n,,,,,,,,,,,,\n,,,LEWISVILLE ISD EASTSIDE 1,,,,,,,,,\n2-Aug,7:30 AM,1-4 semi,LEWISVILLE ISD EASTSIDE 1,23,1stA-,,4thA-,,27,26,14G-023,\n,,,,,,,,,,,,\n,,,LEWISVILLE ISD EASTSIDE 2,,,,,,,,,\n2-Aug,7:30 AM,1-4 semi,LEWISVILLE ISD EASTSIDE 2,24,2ndA-,,3rdA-,,27,26,14G-024,\n,,,,,,,,,,,,\n,,,GARLAND ISD 2,,,,,,,,,\n2-Aug,11:30 AM,3rd,GARLAND ISD 2,26,L24,,L23,,3rd,4th,14G-026,\n,,,,,,,,,,,,\n,,,GARLAND ISD 1,,,,,,,,,\n2-Aug,11:30 AM,1st,GARLAND ISD 1,27,W23,,W24,,1st,2nd,14G-027,\n,,,,,,,,,,,,\npt_Place,,,,,,,,,,,,\n1st,W27,,,,,,,,,,,\n2nd,L27,,,,,,,,,,,\n3rd,W26,,,,,,,,,,,\n4th,L26,,,,,,,,,,,\n5th,W25,,,,,,,,,,,\n6th,L25,,,,,,,,,,,\n7th,L22,,,,,,,,,,,","16u-boys-championship":"Day 1,HOT! RESULTS,SUBMIT SCORES!,Quarter Lengths by Day,,,,,,,,,,,\n\"Thu, July 30\",,,6-6-7-7,,,,,,,,,,,\n,,,Seeds,,,,,,,,,,,\nA,B,C,D,,,,,,,,,,,\nA1(1)-GLADIATORS GOLD,B1(2)-SOUTHSIDE,C1(3)-ROCKY MOUNTAIN WARRIORS,D1(4)-NEW HAVEN HYDRAS,,,,,,,,,,,\nA2(16)-VIPER PIGEON BLUE,B2(15)-NARROWS,C2(14)-SLAP GOLD,D2(13)-HOUSTON HYDRA,,,,,,,,,,,\nA3(17)-ZENITH ALL STARS,B3(18)-GLADIATORS BLACK,C3(19)-KRAKEN SATX,D3(20)-PAC,,,,,,,,,,,\n,,,,,,,,,,,,,,\nE,F,G,H,,,,,,,,,,,\nE1(5)-WEST SUBURBAN,F1(6)-JUNGLE CAT,G1(7)-DYNAMO,H1(8)-ALAMO BLACK,KAHUNA EVENTS,,,,,,,,,,\nE2(12)-LOWPO,F2(11)-CHICACO PARKS DISTRICT,G2(10)-STORM TORNADOES,H2(9)-BCWP,BRACKET BREAKER PROGRAM,,,,,,,,,,\nE3(21)-ALAMO YELLOW,F3(22)-VIPER PIGEON BLACK,G3(23)-DAISY,H3(24)-LONGHORN,CLICK HERE,,,,,,,,,,\n,,,H4(25)-LOWPO RED,,,,,,,,,,,\n,,,,,,,,,,,16B,,,\n,,,LEWISVILLE ISD WESTSIDE 1,,,,,,,,,,,\nDate,Time,Type,Location,Gm #,White,S,Dark,S,W to #,L to #,GMID,,,\n30-Jul,7:30 AM,Group,LEWISVILLE ISD WESTSIDE 1,7,B1(2)-SOUTHSIDE,,B3(18)-GLADIATORS BLACK,,,,16B-007,,,\n30-Jul,8:20 AM,Group,LEWISVILLE ISD WESTSIDE 1,9,G1(7)-DYNAMO,,G3(23)-DAISY,,,,16B-009,,,\n30-Jul,9:10 AM,W/L H1/H4,LEWISVILLE ISD WESTSIDE 1,3,H1(8)-ALAMO BLACK,,H4(25)-LOWPO RED,,13,13A,16B-003,,,\n30-Jul,10:00 AM,Group,LEWISVILLE ISD WESTSIDE 1,15,B2(15)-NARROWS,,B3(18)-GLADIATORS BLACK,,,,16B-015,,,\n30-Jul,10:50 AM,Group,LEWISVILLE ISD WESTSIDE 1,17,G2(10)-STORM TORNADOES,,G3(23)-DAISY,,,,16B-017,,,\n30-Jul,11:40 AM,1st/2ndH,LEWISVILLE ISD WESTSIDE 1,13,W3,,W5,,pt_M2,pt_O3,16B-013,1st/2ndH,,\n30-Jul,12:30 PM,Group,LEWISVILLE ISD WESTSIDE 1,21,B1(2)-SOUTHSIDE,,B2(15)-NARROWS,,,,16B-021,,,\n30-Jul,1:20 PM,Group,LEWISVILLE ISD WESTSIDE 1,23,G1(7)-DYNAMO,,G2(10)-STORM TORNADOES,,,,16B-023,,,\n,,,,,,,,,,,,,,\n30-Jul,3:00 PM,Group,LEWISVILLE ISD WESTSIDE 2,18,C1(3)-ROCKY MOUNTAIN WARRIORS,,C2(14)-SLAP GOLD,,,,16B-018,,,\n30-Jul,3:50 PM,Cross,LEWISVILLE ISD WESTSIDE 1,27,2ndB-,,2ndG-,,pt_O4,au_O1,16B-027,,,\n,,,,,,,,,,,,,,\n,,,,,,,,,,,,,,\n,,,LEWISVILLE ISD WESTSIDE 2,,,,,,,,,,,\nDate,Time,Type,Location,Gm #,White,S,Dark,S,W to #,L to #,GMID,,,\n30-Jul,7:30 AM,Group,LEWISVILLE ISD WESTSIDE 2,1,A1(1)-GLADIATORS GOLD,,A3(17)-ZENITH ALL STARS,,,,16B-001,,,\n30-Jul,8:20 AM,Group,LEWISVILLE ISD WESTSIDE 2,4,F1(6)-JUNGLE CAT,,F3(22)-VIPER PIGEON BLACK,,,,16B-004,,,\n30-Jul,9:10 AM,W/L H2/H3,LEWISVILLE ISD WESTSIDE 2,5,H2(9)-BCWP,,H3(24)-LONGHORN,,13,13A,16B-005,added game,,\n30-Jul,10:00 AM,Group,LEWISVILLE ISD WESTSIDE 2,11,A2(16)-VIPER PIGEON BLUE,,A3(17)-ZENITH ALL STARS,,,,16B-011,,,\n30-Jul,10:50 AM,Group,LEWISVILLE ISD WESTSIDE 2,12,F2(11)-CHICACO PARKS DISTRICT,,F3(22)-VIPER PIGEON BLACK,,,,16B-012,,,\n30-Jul,11:40 AM,3rd/4thH,LEWISVILLE ISD WESTSIDE 2,13A,L3,,L5,,25,au_N3,16B-13A,3rd/4thH,,\n30-Jul,12:30 PM,Group,LEWISVILLE ISD WESTSIDE 2,19,A1(1)-GLADIATORS GOLD,,A2(16)-VIPER PIGEON BLUE,,,,16B-019,,,\n30-Jul,1:20 PM,Group,LEWISVILLE ISD WESTSIDE 2,20,F1(6)-JUNGLE CAT,,F2(11)-CHICACO PARKS DISTRICT,,,,16B-020,,,\n,,,,,,,,,,,,,,\n30-Jul,3:50 PM,Cross,LEWISVILLE ISD WESTSIDE 2,28,2ndD-,,2ndE-,,pt_N3,au_M1,16B-028,,,\n30-Jul,4:40 PM,Cross,LEWISVILLE ISD WESTSIDE 2,25,2ndA-,,W13A,,pt_P3,au_P1,16B-025,,,\n30-Jul,5:30 PM,Cross,LEWISVILLE ISD WESTSIDE 2,26,2ndC-,,2ndF-,,pt_M3,au_N1,16B-026,,,\n,,,,,,,,,,,,,,\n,,,DENTON ISD,,,,,,,,,,,\nDate,Time,Type,Location,Gm #,White,S,Dark,S,W to #,L to #,GMID,,,\n30-Jul,7:30 AM,Group,DENTON ISD,6,D1(4)-NEW HAVEN HYDRAS,,D3(20)-PAC,,,,16B-006,,,\n30-Jul,8:20 AM,Group,DENTON ISD,8,E1(5)-WEST SUBURBAN,,E3(21)-ALAMO YELLOW,,,,16B-008,,,\n30-Jul,9:10 AM,Group,DENTON ISD,2,C1(3)-ROCKY MOUNTAIN WARRIORS,,C3(19)-KRAKEN SATX,,,,16B-002,,,\n30-Jul,10:00 AM,Group,DENTON ISD,14,D2(13)-HOUSTON HYDRA,,D3(20)-PAC,,,,16B-014,,,\n30-Jul,10:50 AM,Group,DENTON ISD,16,E2(12)-LOWPO,,E3(21)-ALAMO YELLOW,,,,16B-016,,,\n30-Jul,11:40 AM,Group,DENTON ISD,10,C2(14)-SLAP GOLD,,C3(19)-KRAKEN SATX,,,,16B-010,,,\n30-Jul,12:30 PM,Group,DENTON ISD,22,D1(4)-NEW HAVEN HYDRAS,,D2(13)-HOUSTON HYDRA,,,,16B-022,,,\n30-Jul,1:20 PM,Group,DENTON ISD,24,E1(5)-WEST SUBURBAN,,E2(12)-LOWPO,,,,16B-024,,,\n,,,,,,,,,,,,,,\nDay 2,,,,,,,,,,,,,,\n\"Fri, July 31\",,,,,,,,,,,,,,\n,Platinum,,,,,,,,,,,,,\n,pt_M,pt_M,pt_O,pt_P,,,,,,,,,,\n1,pt_M1(1stA)-,pt_N1(1stB)-,pt_O1(1stC)-,pt_P1(1stD)-,,,,,,,,,,\n2,pt_M2(W13),pt_N2(1stG)-,pt_O2(1stF)-,pt_P2(1stE)-,,,,,,,,,,\n3,pt_M3(W26),pt_N3(W28),pt_O3(L13),pt_P3(W25),,,,,,,,,,\n,,,pt_O4(W27),,,,,,,,,,,\n,,,,,,,,,,,,,,\n,Gold,,,,,,,,,,,,,\n,au_M,au_N,au_O,au_P,,,,,,,,,,\n1,au_M1(L28),au_N1(L26),au_O1(L27),au_P1(L25),,,,,,,,,,\n2,au_M2(3rdB)-,au_N2(3rdA)-,au_O2(3rdD)-,au_P2(3rdC)-,,,,,,,,,,\n3,au_M3(3rdG)-,au_N3(L13A),au_O3(3rdE)-,au_P3(3rdF)-,,,,,,,,,,\n,,,,,,,,,,,,,,\n,,,,,,,,,,,,,,\n,,,GARLAND ISD 1,,,,,,,,,,,\nDate,Time,Type,Location,Gm #,White,S,Dark,S,W to #,L to #,GMID,,,\n31-Jul,7:30 AM,Group,GARLAND ISD 1,30,pt_N1(1stB)-,,pt_N3(W28),,,,16B-030,,,pt_Group\n31-Jul,8:20 AM,Group,GARLAND ISD 1,32,pt_O2(1stF)-,,pt_O3(L13),,46,38,16B-032,,,pt_Group\n31-Jul,9:10 AM,Group,GARLAND ISD 1,32A,pt_P1(1stD)-,,pt_P3(W25),,,,16B-32A,added,,pt_Group\n31-Jul,10:00 AM,Group,GARLAND ISD 1,34,pt_M1(1stA)-,,pt_M3(W26),,,,16B-034,,,pt_Group\n31-Jul,10:50 AM,Group,GARLAND ISD 1,36,pt_N2(1stG)-,,pt_N3(W28),,,,16B-036,,,pt_Group\n31-Jul,11:40 AM,Group,GARLAND ISD 1,38,L32,,L29A,,54,52,16B-038,,,pt_Group\n31-Jul,12:30 PM,Group,GARLAND ISD 1,40,pt_P2(1stE)-,,pt_P3(W25),,,,16B-040,,,pt_Group\n31-Jul,1:20 PM,Group,GARLAND ISD 1,42,pt_M2(W13),,pt_M3(W26),,,,16B-042,,,pt_Group\n31-Jul,2:10 PM,Group,GARLAND ISD 1,44,pt_N1(1stB)-,,pt_N2(1stG)-,,,,16B-044,,,pt_Group\n31-Jul,3:00 PM,Group,GARLAND ISD 1,46,W32,,W29A,,62,58,16B-046,,,pt_Group\n31-Jul,3:50 PM,Group,GARLAND ISD 1,48,pt_P1(1stD)-,,pt_P2(1stE)-,,,,16B-048,,,pt_Group\n31-Jul,4:40 PM,Group,GARLAND ISD 1,50,pt_M1(1stA)-,,pt_M2(W13),,,,16B-050,,,pt_Group\n31-Jul,5:30 PM,Group,GARLAND ISD 1,52,L38,,3rd_pt_N-,,56,pt_R3,16B-052,,,pt_Group\n,,,,,,,,,,,,,,\n,,,GARLAND ISD 2,,,,,,,,,,,\nDate,Time,Type,Location,Gm #,White,S,Dark,S,W to #,L to #,GMID,,,\n31-Jul,7:30 AM,Group,GARLAND ISD 2,29A,pt_O1(1stC)-,,pt_O4(W27),,46,38,16B-29A,,,pt_Group\n31-Jul,8:20 AM,Group,GARLAND ISD 2,29,au_M1(L28),,au_M2(3rdB)-,,,,16B-029,,,au_Group\n31-Jul,9:10 AM,Group,GARLAND ISD 2,31,au_P1(L25),,pt_P2(1stE)-,,,,16B-031,,,au_Group\n31-Jul,10:00 AM,Group,GARLAND ISD 2,33,au_N1(L26),,au_N2(3rdA)-,,,,16B-033,,,au_Group\n31-Jul,10:50 AM,Group,GARLAND ISD 2,35,au_O1(L27),,au_O2(3rdD)-,,,,16B-035,,,au_Group\n31-Jul,11:40 AM,Group,GARLAND ISD 2,37,au_M1(L28),,au_M3(3rdG)-,,,,16B-037,,,au_Group\n31-Jul,12:30 PM,Group,GARLAND ISD 2,39,au_P1(L25),,au_P3(3rdF)-,,,,16B-039,,,au_Group\n31-Jul,1:20 PM,Group,GARLAND ISD 2,41,au_N1(L26),,au_N3(L13A),,,,16B-041,,,au_Group\n31-Jul,2:10 PM,Group,GARLAND ISD 2,43,au_O1(L27),,au_O3(3rdE)-,,,,16B-043,,,au_Group\n31-Jul,3:00 PM,Group,GARLAND ISD 2,45,au_M2(3rdB)-,,au_M3(3rdG)-,,,,16B-045,,,au_Group\n31-Jul,3:50 PM,Group,GARLAND ISD 2,47,au_P2(3rdC)-,,au_P3(3rdF)-,,,,16B-047,,,au_Group\n31-Jul,4:40 PM,Group,GARLAND ISD 2,49,au_N2(3rdA)-,,au_N3(L13A),,,,16B-049,,,au_Group\n31-Jul,5:30 PM,Group,GARLAND ISD 2,51,au_O2(3rdD)-,,au_O3(3rdE)-,,,,16B-051,,,au_Group\n,,,,,,,,,,,,,,\nDay 3,,,,,,,,,,,,,,\n\"Sat, August 1\",,,,,,,,,,,,,,\npt_R,,,,,,,,,,,,,,\npt_R1(L70),,,,,,,,,,,,,,\npt_R2(L72),,,,,,,,,,,,,,\npt_R3(L52),,,,,,,,,,,,,,\n,,,LEWISVILLE ISD WESTSIDE 1,,,,,,,,,,,\nDate,Time,Type,Location,Gm #,White,S,Dark,S,W to #,L to #,GMID,,,\n1-Aug,7:30 AM,5-8 v 9-12,LEWISVILLE ISD WESTSIDE 1,54,2nd pt_P-,,W38,,64,70,16B-054,,,pt_5-8 v 9-12\n1-Aug,8:30 AM,5-8 v 9-12,LEWISVILLE ISD WESTSIDE 1,56,2nd pt_M-,,W52,,64,70,16B-056,,,pt_5-8 v 9-12\n1-Aug,9:30 AM,5-8 v 9-12,LEWISVILLE ISD WESTSIDE 1,58,L46,,3rd pt_P-,,68,72,16B-058,,,pt_5-8 v 9-12\n1-Aug,10:30 AM,5-8 v 9-12,LEWISVILLE ISD WESTSIDE 1,60,2nd pt_N-,,3rd pt_M-,,68,72,16B-060,,,pt_5-8 v 9-12\n1-Aug,11:30 AM,1-2 v 3-4,LEWISVILLE ISD WESTSIDE 1,62,1st pt_N-,,W46,,78,74,16B-062,,,pt_1-2 v 3-4\n1-Aug,12:30 PM,5-6 v 7-8,LEWISVILLE ISD WESTSIDE 1,64,W54,,W56,,74,88,16B-064,,,pt_5-6 v 7-8\n1-Aug,1:30 PM,1-2 v 3-4,LEWISVILLE ISD WESTSIDE 1,66,1st pt_M-,,1st pt_P-,,77,76,16B-066,,,pt_1-2 v 3-4\n1-Aug,2:30 PM,5-6 v 7-8,LEWISVILLE ISD WESTSIDE 1,68,W58,,W60,,76,88,16B-068,,,pt_5-6 v 7-8\n1-Aug,3:30 PM,9 semi,LEWISVILLE ISD WESTSIDE 1,70,L56,,L54,,83,pt_R1,16B-070,,,pt_9 semi\n1-Aug,4:30 PM,9 semi,LEWISVILLE ISD WESTSIDE 1,72,L60,,L58,,83,pt_R2,16B-072,,,pt_9 semi\n1-Aug,5:30 PM,qtr final,LEWISVILLE ISD WESTSIDE 1,74,L62,,W64,,77,87,16B-074,,,pt_qtr final\n1-Aug,6:30 PM,qtr final,LEWISVILLE ISD WESTSIDE 1,76,L66,,W68,,78,87,16B-076,,,pt_qtr final\n1-Aug,7:30 PM,11-13 RR,LEWISVILLE ISD WESTSIDE 1,76A,pt_R1(L70),,pt_R3(L52),,,,16B-76A,,,pt_11-13 RR\n,,,,,,,,,,,,,,\n,,,LEWISVILLE ISD WESTSIDE 2,,,,,,,,,,,\nDate,Time,Type,Location,Gm #,White,S,Dark,S,W to #,L to #,GMID,,,\n1-Aug,7:30 AM,5-8 v 9-12,LEWISVILLE ISD WESTSIDE 2,53,2nd au_P-,,3rd au_O-,,63,69,16B-053,,,au_5-8 v 9-12\n1-Aug,8:30 AM,5-8 v 9-12,LEWISVILLE ISD WESTSIDE 2,55,2nd au_M-,,3rd au_N-,,63,69,16B-055,,,au_5-8 v 9-12\n1-Aug,9:30 AM,5-8 v 9-12,LEWISVILLE ISD WESTSIDE 2,57,2nd au_O-,,3rd au_P-,,67,71,16B-057,,,au_5-8 v 9-12\n1-Aug,10:30 AM,5-8 v 9-12,LEWISVILLE ISD WESTSIDE 2,59,2nd au_N-,,3rd au_M-,,67,71,16B-059,,,au_5-8 v 9-12\n1-Aug,11:30 AM,1-2 v 3-4,LEWISVILLE ISD WESTSIDE 2,61,1st au_N-,,1st au_O-,,80,73,16B-061,,,au_1-2 v 3-4\n1-Aug,12:30 PM,5-6 v 7-8,LEWISVILLE ISD WESTSIDE 2,63,W53,,W55,,73,85,16B-063,,,au_5-6 v 7-8\n1-Aug,1:30 PM,1-2 v 3-4,LEWISVILLE ISD WESTSIDE 2,65,1st au_M-,,1st au_P-,,79,75,16B-065,,,au_1-2 v 3-4\n1-Aug,2:30 PM,5-6 v 7-8,LEWISVILLE ISD WESTSIDE 2,67,W57,,W59,,75,85,16B-067,,,au_5-6 v 7-8\n1-Aug,3:30 PM,9-12 semi,LEWISVILLE ISD WESTSIDE 2,69,L55,,L53,,82,81,16B-069,,,au_9-12 semi\n1-Aug,4:30 PM,9-12 semi,LEWISVILLE ISD WESTSIDE 2,71,L59,,L57,,82,81,16B-071,,,au_9-12 semi\n1-Aug,5:30 PM,qtr final,LEWISVILLE ISD WESTSIDE 2,73,L61,,W63,,79,86,16B-073,,,au_qtr final\n1-Aug,6:30 PM,qtr final,LEWISVILLE ISD WESTSIDE 2,75,L65,,W67,,80,86,16B-075,,,au_qtr final\n,,,,,,,,,,,,,,\nDay 4,,,,,,,,,,,,,,\n\"Sun, August 2\",,,,,,,,,,,,,,\n,,,LEWISVILLE ISD WESTSIDE 1,,,,,,,,,,,\nDate,Time,Type,Location,Gm #,White,S,Dark,S,W to #,L to #,GMID,,,\n2-Aug,7:30 AM,semi,LEWISVILLE ISD WESTSIDE 1,79,W65,,W73,,92,91,16B-079,,,au_semi\n2-Aug,8:30 AM,semi,LEWISVILLE ISD WESTSIDE 1,80,W61,,W75,,92,91,16B-080,,,au_semi\n2-Aug,9:30 AM,5th,LEWISVILLE ISD WESTSIDE 1,86,L73,,L75,,au_5th,au_6th,16B-086,,,au_5th\n2-Aug,10:30 AM,7th,LEWISVILLE ISD WESTSIDE 1,85,L63,,L67,,au_7th,au_8th,16B-085,,,au_7th\n2-Aug,11:30 AM,3rd,LEWISVILLE ISD WESTSIDE 1,91,L79,,L80,,au_3rd,au_4th,16B-091,,,au_3rd\n2-Aug,12:30 PM,1st,LEWISVILLE ISD WESTSIDE 1,92,W79,,W80,,au_1st,au_2nd,16B-092,,,au_1st\n,,,,,,,,,,,,,,\n,,,LEWISVILLE ISD WESTSIDE 2,,,,,,,,,,,\nDate,Time,Type,Location,Gm #,White,S,Dark,S,W to #,L to #,GMID,,,\n2-Aug,7:30 AM,11th,LEWISVILLE ISD WESTSIDE 2,81,L69,,L71,,au_11th,au_12th,16B-081,,,au_11th\n2-Aug,8:30 AM,9th,LEWISVILLE ISD WESTSIDE 2,82,W69,,W71,,au_9th,au_10th,16B-082,,,au_9th\n2-Aug,9:30 AM,11-13 RR,LEWISVILLE ISD WESTSIDE 2,80A,pt_R3(L52),,pt_R2(L72),,,,16B-80A,,,pt_11-13 RR\n2-Aug,10:30 AM,5th,LEWISVILLE ISD WESTSIDE 2,87,L74,,L76,,pt_5th,pt_6th,16B-087,,,pt_5th\n2-Aug,11:30 AM,7th,LEWISVILLE ISD WESTSIDE 2,88,L64,,L68,,pt_7th,pt_8th,16B-088,,,pt_7th\n2-Aug,12:30 PM,9th,LEWISVILLE ISD WESTSIDE 2,83,W70,,W72,,pt_9th,pt_10th,16B-083,,,pt_9th\n2-Aug,1:30 PM,11-13 RR,LEWISVILLE ISD WESTSIDE 2,84,pt_R1(L70),,pt_R2(L72),,,,16B-084,,,pt_11-13 RR\n,,,,,,,,,,,,,,\n,,,GARLAND ISD 2,,,,,,,,,,,\nDate,Time,Type,Location,Gm #,White,S,Dark,S,W to #,L to #,GMID,,,\n2-Aug,7:30 AM,semi,GARLAND ISD 2,78,W62,,W76,,90,89,16B-078,,,pt_semi\n,,,,,,,,,,,,,,\n2-Aug,1:30 PM,3rd,GARLAND ISD 2,89,L77,,L78,,pt_3rd,pt_4th,16B-089,,,pt_3rd\n,,,,,,,,,,,,,,\n,,,GARLAND ISD 1,,,,,,,,,,,\nDate,Time,Type,Location,Gm #,White,S,Dark,S,W to #,L to #,GMID,,,\n2-Aug,7:30 AM,semi,GARLAND ISD 1,77,W74,,W66,,90,89,16B-077,,,pt_semi\n,,,,,,,,,,,,,,\n2-Aug,1:30 PM,1st,GARLAND ISD 1,90,W77,,W78,,pt_1st,pt_2nd,16B-090,,,pt_1st\n,,,,,,,,,,,,,,\npt_Place,,au_Place,,,,,,,,,,,,\n1st,W90,1st,W92,,,,,,,,,,,\n2nd,L90,2nd,L92,,,,,,,,,,,\n3rd,W89,3rd,W91,,,,,,,,,,,\n4th,L89,4th,L91,,,,,,,,,,,\n5th,W87,5th,W86,,,,,,,,,,,\n6th,L87,6th,L86,,,,,,,,,,,\n7th,W88,7th,W85,,,,,,,,,,,\n8th,L88,8th,L85,,,,,,,,,,,\n9th,W83,9th,W82,,,,,,,,,,,\n10th,L83,10th,L82,,,,,,,,,,,\n11th,,11th,W81,,,,,,,,,,,\n12th,,12th,L81,,,,,,,,,,,\n13th,,,,,,,,,,,,,,","16u-girls-championship":"Day 1,HOT! RESULTS,SUBMIT SCORES!,Quarter Lengths by Day,,,,,,,,\n\"Thu, July 30\",,,6-6-7-7,,,,,,,,\n,,,Seeds,,,,,,,,\nBRACKETS,,SEEDS not! Snake no QF rematch,,,,,,,,,\nA,B,A,B,,KAHUNA EVENTS,,,,,,\nA1-WEST SUBURBAN,B1-TEAM ORLANDO,1,2,,BRACKET BREAKER PROGRAM,,,,,,\nA2-SLAP,B2-HOUSTON HYDRA,3,4,,CLICK HERE,,,,,,\nA3-NEW HAVEN HYDRAS,B3-SEA MONSTERS PREMIER,5,6,,,,,,,,\nA4-KRAKEN SATX,B4-ALAMO,7,8,,,,,,,,\nA5-DISTRICT BLOSSOMS,B5-VIPER PIGEON PINK,9,10,,,,,,,,\nA6-VIPER PIGEON RED,B6-PAC,11,12,,,,,,,,16G\n,,,,,,,,,,,\n,,,,,,,,,,,\nDay 1,,,SMU 2,,,,,,,,\nDate,Time,Type,Location,Gm #,White,S,Dark,S,W to #,L to #,GMID\n30-Jul,7:30 AM,\"Bracket A1,A6\",SMU 2,1,A1-WEST SUBURBAN,,A6-VIPER PIGEON RED,,,,16G-001\n30-Jul,8:20 AM,\"Bracket A2,A5\",SMU 2,2,A2-SLAP,,A5-DISTRICT BLOSSOMS,,,,16G-002\n30-Jul,9:10 AM,\"Bracket A3,A4\",SMU 2,3,A3-NEW HAVEN HYDRAS,,A4-KRAKEN SATX,,,,16G-003\n30-Jul,10:00 AM,\"Bracket B1,B6\",SMU 2,4,B1-TEAM ORLANDO,,B6-PAC,,,,16G-004\n30-Jul,10:50 AM,\"Bracket B2,B5\",SMU 2,5,B2-HOUSTON HYDRA,,B5-VIPER PIGEON PINK,,,,16G-005\n30-Jul,11:40 AM,\"Bracket B3,B4\",SMU 2,6,B3-SEA MONSTERS PREMIER,,B4-ALAMO,,,,16G-006\n30-Jul,12:30 PM,\"Bracket A1,A5\",SMU 2,7,A1-WEST SUBURBAN,,A5-DISTRICT BLOSSOMS,,,,16G-007\n30-Jul,1:20 PM,\"Bracket A4,A6\",SMU 2,8,A4-KRAKEN SATX,,A6-VIPER PIGEON RED,,,,16G-008\n30-Jul,2:10 PM,Bracket A2.A3,SMU 2,9,A2-SLAP,,A3-NEW HAVEN HYDRAS,,,,16G-009\n30-Jul,3:00 PM,\"Bracket B4,B6\",SMU 2,11,B4-ALAMO,,B6-PAC,,,,16G-011\n30-Jul,3:50 PM,\"Bracket A1,A4\",SMU 2,13,A1-WEST SUBURBAN,,A4-KRAKEN SATX,,,,16G-013\n30-Jul,4:40 PM,\"Bracket A2,A6\",SMU 2,15,A2-SLAP,,A6-VIPER PIGEON RED,,,,16G-015\n,,,,,,,,,,,\n,,,SMU 1,,,,,,,,\n30-Jul,3:00 PM,\"Bracket B1,B5\",SMU 1,10,B1-TEAM ORLANDO,,B5-VIPER PIGEON PINK,,,,16G-010\n30-Jul,3:50 PM,\"Bracket B2,B3\",SMU 1,12,B2-HOUSTON HYDRA,,B3-SEA MONSTERS PREMIER,,,,16G-012\n30-Jul,4:40 PM,\"Bracket A3,A5\",SMU 1,14,A3-NEW HAVEN HYDRAS,,A5-DISTRICT BLOSSOMS,,,,16G-014\n,,,,,,,,,,,\nDay 2,,,,,,,,,,,\n\"Fri, July 31\",,,,,,,,,,,\n,,,LEWISVILLE ISD WESTSIDE 1,,,,,,,,\nDate,Time,Type,Location,Gm #,White,S,Dark,S,W to #,L to #,GMID\n31-Jul,7:30 AM,\"Bracket B1,B4\",LEWISVILLE ISD WESTSIDE 1,16,B1-TEAM ORLANDO,,B4-ALAMO,,,,16G-016\n31-Jul,8:20 AM,\"Bracket B3,B5\",LEWISVILLE ISD WESTSIDE 1,17,B3-SEA MONSTERS PREMIER,,B5-VIPER PIGEON PINK,,,,16G-017\n31-Jul,9:10 AM,\"Bracket B2,B6\",LEWISVILLE ISD WESTSIDE 1,18,B2-HOUSTON HYDRA,,B6-PAC,,,,16G-018\n,,,,,,,,,,,\n31-Jul,10:50 AM,\"Bracket B1,B3\",LEWISVILLE ISD WESTSIDE 1,20,B1-TEAM ORLANDO,,B3-SEA MONSTERS PREMIER,,,,16G-020\n31-Jul,11:40 AM,\"Bracket B2,B4\",LEWISVILLE ISD WESTSIDE 1,22,B2-HOUSTON HYDRA,,B4-ALAMO,,,,16G-022\n31-Jul,12:30 PM,\"Bracket B5,B6\",LEWISVILLE ISD WESTSIDE 1,24,B5-VIPER PIGEON PINK,,B6-PAC,,,,16G-024\n,,,,,,,,,,,\n31-Jul,2:10 PM,\"Bracket B1,B4\",LEWISVILLE ISD WESTSIDE 1,26,B1-TEAM ORLANDO,,B2-HOUSTON HYDRA,,,,16G-026\n31-Jul,3:00 PM,\"Bracket B3,B6\",LEWISVILLE ISD WESTSIDE 1,28,B3-SEA MONSTERS PREMIER,,B6-PAC,,,,16G-028\n,,,,,,,,,,,\n,,,LEWISVILLE ISD WESTSIDE 2,,,,,,,,\nDate,Time,Type,Location,Gm #,White,S,Dark,S,W to #,L to #,GMID\n31-Jul,7:30 AM,\"Bracket A1,A3\",LEWISVILLE ISD WESTSIDE 1,19,A1-WEST SUBURBAN,,A3-NEW HAVEN HYDRAS,,,,16G-019\n31-Jul,8:20 AM,\"Bracket A2,A4\",LEWISVILLE ISD WESTSIDE 2,21,A2-SLAP,,A4-KRAKEN SATX,,,,16G-021\n31-Jul,9:10 AM,\"Bracket A5,A6\",LEWISVILLE ISD WESTSIDE 2,23,A5-DISTRICT BLOSSOMS,,A6-VIPER PIGEON RED,,,,16G-023\n,,,,,,,,,,,\n31-Jul,10:50 AM,\"Bracket A1,A2\",LEWISVILLE ISD WESTSIDE 2,25,A1-WEST SUBURBAN,,A2-SLAP,,,,16G-025\n31-Jul,11:40 AM,\"Bracket A3,A6\",LEWISVILLE ISD WESTSIDE 2,27,A3-NEW HAVEN HYDRAS,,A6-VIPER PIGEON RED,,,,16G-027\n31-Jul,12:30 PM,\"Bracket A4,A5\",LEWISVILLE ISD WESTSIDE 2,29,A4-KRAKEN SATX,,A5-DISTRICT BLOSSOMS,,,,16G-029\n,,,,,,,,,,,\n,,,,,,,,,,,\n31-Jul,3:00 PM,\"Bracket B4,B5\",LEWISVILLE ISD WESTSIDE 2,30,B4-ALAMO,,B5-VIPER PIGEON PINK,,,,16G-030\n,,,,,,,,,,,\nDay 3,,,,,,,,,,,\n\"Sat, August 1\",,,,,,,,,,,\n,,note 4/5A and 4/5B played in bracket,SMU 1,,,,,,,,\nDate,Time,Type,Location,Gm #,White,S,Dark,S,W to #,L to #,GMID\n1-Aug,9:30 AM,9-12 RR prelim,SMU 1,31,5thA-,,6thB-,,,,16G-031\n1-Aug,10:30 AM,1v8 QF,SMU 1,33,1stA-,,4thB-,,41,39,16G-033\n1-Aug,11:30 AM,4v5 QF,SMU 1,34,2ndB-,,3rdA-,,41,39,16G-034\n,,,,,,,,,,,\n1-Aug,2:30 PM,9-12 RR prelim,SMU 1,37,5thA-,,5thB-,,,,16G-037\n,,,,,,,,,,,\n1-Aug,4:30 PM,1-4 SF 1v4,SMU 1,41,W#33,,W#34,,48,47,16G-041\n1-Aug,5:30 PM,1-4 SF 2v3,SMU 1,42,W#35,,W#36,,48,47,16G-042\n,,,,,,,,,,,\n,,,SMU 2,,,,,,,,\nDate,Time,Type,Location,Gm #,White,S,Dark,S,W to #,L to #,GMID\n1-Aug,9:30 AM,9-12 RR prelim,SMU 2,32,5thB-,,6thA-,,,,16G-032\n1-Aug,10:30 AM,2v7 QF,SMU 2,35,1stB-,,4thA-,,,,16G-035\n1-Aug,11:30 AM,3v6 QF,SMU 2,36,2ndA-,,3rdB-,,,,16G-036\n,,,,,,,,,,,\n1-Aug,2:30 PM,9-12 RR prelim,SMU 2,38,6thA-,,6thB-,,,,16G-038\n,,,,,,,,,,,\n1-Aug,4:30 PM,5-8 SF 5v8,SMU 1,39,L#34,,L#33,,46,45,16G-039\n1-Aug,5:30 PM,5-8 SF 6v7,SMU 1,40,L#36,,L#35,,46,45,16G-040\n,,,,,,,,,,,\nDay 4,,,,,,,,,,,\n\"Sun, August 2\",,,,,,,,,,,\n,,note 4/5A and 4/5B played in bracket,CARROL ISD 2,,,,,,,,\nDate,Time,Type,Location,Gm #,White,S,Dark,S,W to #,L to #,GMID\n2-Aug,8:00 AM,5th,CARROL ISD 2,46,W#39,,W#40,,5th,6th,16G-046\n2-Aug,9:00 AM,7th,CARROL ISD 2,45,L#40,,L#39,,7th,8th,16G-045\n,,,,,,,,,,,\n2-Aug,11:00 AM,9th,CARROL ISD 2,44,9th(afterRR),,10th(afterRR),,9th,10th,16G-044\n2-Aug,12:00 PM,11th,CARROL ISD 2,43,11th(afterRR),,12th(afterRR)-,,11th,12th,16G-043\n,,,,,,,,,,,\n,,,GARLAND ISD 2,,,,,,,,\nDate,Time,Type,Location,Gm #,White,S,Dark,S,W to #,L to #,GMID\n2-Aug,10:30 AM,3rd,GARLAND ISD 2,47,L#42,,L#41,,3rd,4th,16G-047\n,,,,,,,,,,,\n,,,GARLAND ISD 1,,,,,,,,\nDate,Time,Type,Location,Gm #,White,S,Dark,S,W to #,L to #,GMID\n2-Aug,10:30 AM,1st,GARLAND ISD 1,48,W#41,,W#42,,1st,2nd,16G-048\n,,,,,,,,,,,\npt_Place,,,,,,,,,,,\n1st,,,,,,,,,,,\n2nd,,,,,,,,,,,\n3rd,,,,,,,,,,,\n4th,,,,,,,,,,,\n5th,,,,,,,,,,,\n6th,,,,,,,,,,,\n7th,,,,,,,,,,,\n8th,,,,,,,,,,,\n9th,,KAHUNA EVENTS,,,,,,,,,\n10th,,BRACKET BREAKER PROGRAM,,,,,,,,,\n11th,,CLICK HERE,,,,,,,,,\n12th,,,,,,,,,,,","18u-boys-championship":"Day 1,HOT! RESULTS,SUBMIT SCORES!,Quarter Lengths by Day,,,,,,,,,,\n\"Thu, July 30\",Seeds,,6-6-7-7,,,,,,,,,,\n23 teams,,,,,,,,,,,,,\nA rr,B 1/4 2/3,C 1/4 2/3,,,KAHUNA EVENTS,,,,,,,,\nA1-SEA MONSTERS PREMIER,B1-NEW HAVEN HYDRAS,C1-TEAM ORLANDO,,,BRACKET BREAKER PROGRAM,,,,,,,,\nA2-ALAMO,B2-KRAKEN SATX,C2-KRAKEN,,,CLICK HERE,,,,,,,,\nA3-BCWP,B3-DAISY,C3-GATEWAY,,,,,,,,,,,\n,B4-ZENITH ALL STARS,C4-VIPER PIGEON BLACK,,,,,,,,,,,\n,,,,,,,,,,,,,\nD 1/4 2/3,E 1/4 2/3,F 1/4 2/3,,,,,,,,,,,\nD1-GLADIATORS,E1-ORLANDO THUNDER,F1-CWPC,,,,,,,,,,,\nD2-SOUTHSIDE,E2-STORM HURRICANES,F2-HOUSTON HYDRA,,,,,,,,,,,\nD3-VIPER PIGEON BLUE,E3-KRAKEN CVU,F3-ZOO,,,,,,,,,,,\nD4-BCWP BLUE,E4-THUNDER,F4-LONGHORN WHITE,,,,,,,,,18B,,\n,,,GARLAND ISD 1,,,,,,,,,,\nDate,Time,Type,Location,Gm #,White,S,Dark,S,W to #,L to #,GMID,,\n30-Jul,7:30 AM,Group,GARLAND ISD 1,1,C1-TEAM ORLANDO,,C4-VIPER PIGEON BLACK,,13,15,18B-001,,\n30-Jul,8:20 AM,Group,GARLAND ISD 1,3,C2-KRAKEN,,C3-GATEWAY,,13,15,18B-003,,\n30-Jul,9:10 AM,Group,GARLAND ISD 1,5,D1-GLADIATORS,,D4-BCWP BLUE,,17,19,18B-005,,\n30-Jul,10:00 AM,Group,GARLAND ISD 1,7,D2-SOUTHSIDE,,D3-VIPER PIGEON BLUE,,17,19,18B-007,,\n30-Jul,10:50 AM,Group,GARLAND ISD 1,9,E1-ORLANDO THUNDER,,E4-THUNDER,,21,23,18B-009,,\n30-Jul,11:40 AM,Group,GARLAND ISD 1,11,E2-STORM HURRICANES,,E3-KRAKEN CVU,,21,23,18B-011,,\n30-Jul,12:30 PM,Group,GARLAND ISD 1,13,W#1,,W#3,,pt_O1,24,18B-013,,\n30-Jul,1:20 PM,Group,GARLAND ISD 1,15,L#1,,L#3,,99,cu_M5,18B-015,,\n30-Jul,2:10 PM,Group,GARLAND ISD 1,17,W#5,,W#7,,pt_P1,99,18B-017,,\n30-Jul,3:00 PM,Group,GARLAND ISD 1,19,L#5,,L#5,,24,cu_N5,18B-019,,\n30-Jul,3:50 PM,Group,GARLAND ISD 1,21,W#9,,W#11,,pt_P2,25,18B-021,,\n30-Jul,4:40 PM,Group,GARLAND ISD 1,23,L#9,,L#11,,27,cu_M4,18B-023,,\n30-Jul,5:30 PM,Cross,GARLAND ISD 1,99,L#17,,W#15,,pt_M3,cu_N2,18B-099,,\n30-Jul,6:20 PM,Cross,GARLAND ISD 1,24,L#13,,W#19,,pt_N3,cu_M2,18B-024,,\n30-Jul,7:10 PM,Cross,GARLAND ISD 1,27,W#23,,L#16,,pt_N2,cu_N3,18B-027,,\n,,,,,,,,,,,,,\n,,,GARLAND ISD 2,,,,,,,,,,\nDate,Time,Type,Location,Gm #,White,S,Dark,S,W to #,L to #,GMID,,\n30-Jul,7:30 AM,Group,GARLAND ISD 2,2,A1-SEA MONSTERS PREMIER,,A3-BCWP,,,,18B-002,,\n30-Jul,8:20 AM,Group,GARLAND ISD 2,4,F1-CWPC,,F4-LONGHORN WHITE,,16,14,18B-004,,\n30-Jul,9:10 AM,Group,GARLAND ISD 2,6,F2-HOUSTON HYDRA,,F3-ZOO,,16,14,18B-006,,\n30-Jul,10:00 AM,Group,GARLAND ISD 2,8,B1-NEW HAVEN HYDRAS,,B4-ZENITH ALL STARS,,18,22,18B-008,,\n30-Jul,10:50 AM,Group,GARLAND ISD 2,10,B2-KRAKEN SATX,,B3-DAISY,,18,22,18B-010,,\n30-Jul,11:40 AM,Group,GARLAND ISD 2,12,A2-ALAMO,,A3-BCWP,,,,18B-012,,\n30-Jul,12:30 PM,Group,GARLAND ISD 2,14,L#4,,L#6,,25,cu_N4,18B-014,,\n30-Jul,1:20 PM,Group,GARLAND ISD 2,16,W#4,,W#6,,pt_O2,27,18B-016,,\n30-Jul,2:10 PM,Group,GARLAND ISD 2,18,W#8,,W#10,,pt_N1,26,18B-018,,\n30-Jul,3:00 PM,Group,GARLAND ISD 2,20,A1-SEA MONSTERS PREMIER,,A2-ALAMO,,,,18B-020,,\n30-Jul,3:50 PM,Group,GARLAND ISD 2,22,L#8,,L#10,,28,cu_N6,18B-022,,\n,,,,,,,,,,,,,\n30-Jul,5:30 PM,Cross,GARLAND ISD 2,26,L#18,,3rd A,,pt_O3,cu_N1,18B-026,,\n30-Jul,6:20 PM,Cross,GARLAND ISD 2,28,2nd A,,W#22,,pt_P3,cu_M1,18B-028,,\n30-Jul,7:10 PM,Cross,GARLAND ISD 2,25,L#21,,W#14,,pt_M2,cu_M3,18B-025,,\n,,,,,,,,,,,,,\nDay 2,,,,,,,,,,,,,\n\"Fri, July 31\",,,,,,,,,,,,,\n,Platinum,,,,,,,,,,,,\n,pt_M,pt_N,pt_O,pt_P,,,,,,,,,\n1,au_M1(1stA),pt_N1(W18),pt_O1(W13),pt_P1(W17),,,,,,,,,\n2,pt_M2(W25),pt_N2(W27),pt_O2(W16),pt_P2(W21),,,,,,,,,\n3,pt_M3(W99),pt_N3(W24),pt_O3(W26),pt_P3(W28),,,,,,,,,\n,,,,,,,,,,,,,\n,Gold,,,,,,,,,,,,\n,cu_M,cu_N,,,,,,,,,,,\n1,cu_M1(L28),cu_N1(L26),,,,,,,,,,,\n2,cu_M2(L24),cu_N2(L99),,,,,,,,,,,\n3,cu_M3(L25),cu_N3(L27),,,,,,,,,,,\n4,cu_M4(L23),cu_N4(L14),,,,,,,,,,,\n5,cu_M5(L15),cu_N5(L19),,,,,,,,,pt_,,\n6,,cu_N6(L22),,,,,,,,,,,\n,,,SMU 1,,,,,,,,,,\nDate,Time,Type,Location,Gm #,White,S,Dark,S,W to #,L to #,GMID,,\n31-Jul,7:30 AM,Group,SMU 1,29,au_M1(1stA),,pt_M2(W25),,,,18B-029,,pt_Group\n31-Jul,8:20 AM,Group,SMU 1,31,pt_P1(W17),,pt_P2(W21),,,,18B-031,,pt_Group\n31-Jul,9:10 AM,Group,SMU 1,33,pt_N1(W18),,pt_N2(W27),,,,18B-033,,pt_Group\n31-Jul,10:00 AM,Group,SMU 1,35,pt_O1(W13),,pt_O2(W16),,,,18B-035,,pt_Group\n31-Jul,10:50 AM,Group,SMU 1,37,au_M1(1stA),,pt_M3(W99),,,,18B-037,,pt_Group\n31-Jul,11:40 AM,Group,SMU 1,39,pt_P1(W17),,pt_P3(W28),,,,18B-039,,pt_Group\n31-Jul,12:30 PM,Group,SMU 1,41,pt_N1(W18),,pt_N3(W24),,,,18B-041,,pt_Group\n31-Jul,1:20 PM,Group,SMU 1,43,pt_O1(W13),,pt_O3(W26),,,,18B-043,,pt_Group\n31-Jul,2:10 PM,Group,SMU 1,45,pt_M2(W25),,pt_M3(W99),,,,18B-045,,pt_Group\n31-Jul,3:00 PM,Group,SMU 1,47,pt_P2(W21),,pt_P3(W28),,,,18B-047,,pt_Group\n31-Jul,3:50 PM,Group,SMU 1,49,pt_N2(W27),,pt_N3(W24),,,,18B-049,,pt_Group\n31-Jul,4:40 PM,Group,SMU 1,51,pt_O2(W16),,pt_O3(W26),,,,18B-051,,pt_Group\n,,,,,,,,,,,,,\n,,,SMU 2,,,,,,,,au_,,\nDate,Time,Type,Location,Gm #,White,S,Dark,S,W to #,L to #,GMID,,\n31-Jul,7:30 AM,Group,SMU 2,30,cu_M2(L24),,cu_M4(L23),,,,18B-030,,au_Group\n31-Jul,8:20 AM,Group,SMU 2,32,cu_M3(L25),,cu_M5(L15),,,,18B-032,,au_Group\n31-Jul,9:10 AM,Group,SMU 2,34,cu_N1(L26),,cu_N3(L27),,,,18B-034,,au_Group\n31-Jul,10:00 AM,Group,SMU 2,36,cu_N2(L99),,cu_N5(L19),,,,18B-036,,au_Group\n31-Jul,10:50 AM,Group,SMU 2,38,cu_N4(L14),,cu_N6(L22),,,,18B-038,,au_Group\n31-Jul,11:40 AM,Group,SMU 2,40,cu_M4(L23),,cu_M1(L28),,,,18B-040,,au_Group\n31-Jul,12:30 PM,Group,SMU 2,42,cu_M5(L15),,cu_M2(L24),,,,18B-042,,au_Group\n31-Jul,1:20 PM,Group,SMU 2,44,cu_N3(L27),,cu_N5(L19),,,,18B-044,,au_Group\n31-Jul,2:10 PM,Group,SMU 2,46,cu_N1(L26),,cu_N4(L14),,,,18B-046,,au_Group\n31-Jul,3:00 PM,Group,SMU 2,48,cu_N2(L99),,cu_N6(L22),,,,18B-048,,au_Group\n31-Jul,3:50 PM,Group,SMU 2,50,cu_M1(L28),,cu_M3(L25),,,,18B-050,,au_Group\n,,,,,,,,,,,,,\nDay 3,,,,,,,,,,,,,\n\"Sat, August 1\",,,,,,,,,,,,,\n,,,GARLAND ISD 1,,,,,,,,,,\nDate,Time,Type,Location,Gm #,White,S,Dark,S,W to #,L to #,GMID,,\n1-Aug,7:30 AM,5-8 v 9-12,GARLAND ISD 1,53,2nd pt_P,,3rd pt_O,,63,69,18B-053,,pt_5-8 v 9-12\n1-Aug,8:30 AM,5-8 v 9-12,GARLAND ISD 1,55,2nd pt_M,,3rd pt_N,,63,69,18B-055,,pt_5-8 v 9-12\n1-Aug,9:30 AM,5-8 v 9-12,GARLAND ISD 1,57,2nd pt_O,,3rd pt_P,,67,71,18B-057,,pt_5-8 v 9-12\n1-Aug,10:30 AM,5-8 v 9-12,GARLAND ISD 1,59,2nd pt_N,,3rd pt_M,,67,71,18B-059,,pt_5-8 v 9-12\n1-Aug,11:30 AM,1-2 v 3-4,GARLAND ISD 1,61,1st pt_N,,1st pt_O,,80,73,18B-061,,pt_1-2 v 3-4\n1-Aug,12:30 PM,5-6 v 7-8,GARLAND ISD 1,63,W#53,,W#55,,73,85,18B-063,,pt_5-6 v 7-8\n1-Aug,1:30 PM,1-2 v 3-4,GARLAND ISD 1,65,1st pt_M,,1st pt_P,,79,75,18B-065,,pt_1-2 v 3-4\n1-Aug,2:30 PM,5-6 v 7-8,GARLAND ISD 1,67,W#57,,W#59,,75,85,18B-067,,pt_5-6 v 7-8\n1-Aug,3:30 PM,9-12 semi,GARLAND ISD 1,69,L#55,,L#53,,82,81,18B-069,,pt_9-12 semi\n1-Aug,4:30 PM,9-12 semi,GARLAND ISD 1,71,L#59,,L#57,,82,81,18B-071,,pt_9-12 semi\n1-Aug,5:30 PM,qtr final,GARLAND ISD 1,73,L#61,,W#63,,79,86,18B-073,,pt_qtr final\n1-Aug,6:30 PM,qtr final,GARLAND ISD 1,75,L#65,,W#67,,80,86,18B-075,,pt_qtr final\n1-Aug,7:30 PM,Group,GARLAND ISD 1,98,cu_M1(L28),,cu_M2(L24),,,,18B-098,,au_Group\n,,,,,,,,,,,,,\n,,,GARLAND ISD 2,,,,,,,,,,\nDate,Time,Type,Location,Gm #,White,S,Dark,S,W to #,L to #,GMID,,\n1-Aug,7:30 AM,Group,GARLAND ISD 2,54,cu_N5(L19),,cu_N1(L26),,,,18B-054,,au_Group\n1-Aug,8:30 AM,Group,GARLAND ISD 2,56,cu_N4(L14),,cu_N2(L99),,,,18B-056,,au_Group\n1-Aug,9:30 AM,Group,GARLAND ISD 2,58,cu_N6(L22),,cu_N3(L27),,,,18B-058,,au_Group\n1-Aug,10:30 AM,Group,GARLAND ISD 2,60,cu_M4(L23),,cu_M5(L15),,,,18B-060,,au_Group\n1-Aug,11:30 AM,Group,GARLAND ISD 2,62,cu_M2(L24),,cu_M3(L25),,,,18B-062,,au_Group\n1-Aug,12:30 PM,Group,GARLAND ISD 2,64,cu_N1(L26),,cu_N2(L99),,,,18B-064,,au_Group\n1-Aug,1:30 PM,Group,GARLAND ISD 2,66,cu_N3(L27),,cu_N4(L14),,,,18B-066,,au_Group\n1-Aug,2:30 PM,Group,GARLAND ISD 2,68,cu_N5(L19),,cu_N6(L22),,,,18B-068,,au_Group\n1-Aug,3:30 PM,Group,GARLAND ISD 2,70,cu_M5(L15),,cu_M1(L28),,,,18B-070,,au_Group\n1-Aug,4:30 PM,Group,GARLAND ISD 2,72,cu_M3(L25),,cu_M4(L23),,,,18B-072,,au_Group\n1-Aug,5:30 PM,Group,GARLAND ISD 2,74,cu_N3(L27),,cu_N2(L99),,,,18B-074,,au_Group\n1-Aug,6:30 PM,Group,GARLAND ISD 2,76,cu_N5(L19),,cu_N4(L14),,,,18B-076,,au_Group\n1-Aug,7:30 PM,Group,GARLAND ISD 2,97,cu_N6(L22),,cu_N1(L26),,,,18B-097,,au_Group\n,,,,,,,,,,,,,\nDay 4,,,,,,,,,,,,,\n\"Sun, August 2\",,,,,,,,,,,,,\n,,,SMU 2,,,,,,,,,,\nDate,Time,Type,Location,Gm #,White,S,Dark,S,W to #,L to #,GMID,,\n2-Aug,7:30 AM,7th,SMU 2,85,L#63,,L#67,,pt_7th,pt_8th,18B-085,,pt_7th\n2-Aug,8:30 AM,5th,SMU 2,86,L#73,,L#75,,pt_5th,pt_6th,18B-086,,pt_5th\n2-Aug,9:30 AM,9th-11th,SMU 2,87,5th cu_M,,6th cu_N,,,,18B-087,,au_9th-11th\n2-Aug,10:30 AM,9th,SMU 2,82,W#69,,W#71,,pt_9th,pt_10th,18B-082,,pt_9th\n2-Aug,11:30 AM,11th,SMU 2,81,L#69,,L#71,,pt_11th,pt_12th,18B-081,,pt_11th\n2-Aug,12:30 PM,9th-11th,SMU 2,84,5th cu_M,,5th cu_N,,,,18B-084,,au_9th-11th\n,,,,,,,,,,,,,\n,,,SMU 1,,,,,,,,,,\nDate,Time,Type,Location,Gm #,White,S,Dark,S,W to #,L to #,GMID,,\n2-Aug,7:30 AM,Semi,SMU 1,77,1st cu_M,,2nd cu_N,,90,89,18B-077,,au_Semi\n2-Aug,8:30 AM,Semi,SMU 1,78,1st cu_N,,2nd cu_M,,90,89,18B-078,,au_Semi\n2-Aug,9:30 AM,7th,SMU 1,88,4th cu_M,,4th cu_N,,au_7th,au_8th,18B-088,,au_7th\n2-Aug,10:30 AM,5th,SMU 1,83,3rd cu_M,,3rd cu_N,,au_5th,au_6th,18B-083,,au_5th\n2-Aug,11:30 AM,3rd,SMU 1,89,L#77,,L#78,,au_3rd,au_4th,18B-089,,au_3rd\n2-Aug,12:30 PM,1st,SMU 1,90,W#77,,W#78,,au_1st,au_2nd,18B-090,,au_1st\n,,,,,,,,,,,,,\n,,,GARLAND ISD 2,,,,,,,,,,\nDate,Time,Type,Location,Gm #,White,S,Dark,S,W to #,L to #,GMID,,\n2-Aug,9:30 AM,Semi,GARLAND ISD 2,80,W#61,,W#75,,92,91,18B-080,,pt_Semi\n,,,,,,,,,,,,,\n2-Aug,3:30 PM,3rd,GARLAND ISD 2,91,L#79,,L#80,,pt_3rd,pt_4th,18B-091,,pt_3rd\n,,,,,,,,,,,,,\n,,,GARLAND ISD 1,,,,,,,,,,\nDate,Time,Type,Location,Gm #,White,S,Dark,S,W to #,L to #,GMID,,\n2-Aug,9:30 AM,Semi,GARLAND ISD 1,79,W#65,,W#73,,92,91,18B-079,,pt_Semi\n,,,,,,,,,,,,,\n2-Aug,3:30 PM,1st,GARLAND ISD 1,92,W#79,,W#80,,pt_1st,pt_2nd,18B-092,,pt_1st","18u-girls-championship":"Day 1,HOT! RESULTS,SUBMIT SCORES!,Quarter Lengths by Day,,,,,,,,,,\n\"Thu, July 30\",,,6-6-7-7,,,,,,,,,,\n,,,Seeds,,,,,,,,,,\n,,,,,,,,,,,,,\nA,B,C,D,E,F,,KAHUNA EVENTS,,,,,,\nA1(1)-SEA MONSTERS PREMIER,B1(2)-HOUSTON HYDRA,C1(3)-NEW HAVEN HYDRAS,D1(4)-VIPER PIGEONS,E1(5)-SLAP,F1(6)-KRAKEN,,BRACKET BREAKER PROGRAM,,,,,,\nA2(12)-ALAMO,B2(11)-ZOO,C2(10)-SOUTHLAKE,D2(9)-ST LOUIS LIONS,E2(8)-STORM TSUNAMIS,F2(7)-PEGASUS,,CLICK HERE,,,,,,\nA3(13)-KRAKEN SATX,B3(14)-BCWP,C3(15)-FLEET,D3(16)-STORM CYCLONES,E3(17)-LONGHORN WHITE,F3(18)-ZENITH ALL STARS,,,,,,,,\n,,,,,,,,,,,18G,,\n,,,CARROL ISD 1,,,,,,,,,,\nDate,Time,Type,Location,Gm #,White,S,Dark,S,W to #,L to #,GMID,,\n30-Jul,8:00 AM,\"A bracket A1,A3\",CARROL ISD 1,1,A1(1)-SEA MONSTERS PREMIER,,A3(13)-KRAKEN SATX,,RR,RR,18G-001,,\n30-Jul,8:50 AM,\"F bracket F1,F3\",CARROL ISD 1,2,F1(6)-KRAKEN,,F3(18)-ZENITH ALL STARS,,RR,RR,18G-002,,\n30-Jul,9:40 AM,\"C bracket C1,C3\",CARROL ISD 1,5,C1(3)-NEW HAVEN HYDRAS,,C3(15)-FLEET,,RR,RR,18G-005,,\n30-Jul,10:30 AM,\"A bracket A2,A3\",CARROL ISD 1,7,A2(12)-ALAMO,,A3(13)-KRAKEN SATX,,RR,RR,18G-007,,\n30-Jul,11:20 AM,\"F bracket F2,F3\",CARROL ISD 1,8,F2(7)-PEGASUS,,F3(18)-ZENITH ALL STARS,,RR,RR,18G-008,,\n30-Jul,12:10 PM,\"C bracket C2,C3\",CARROL ISD 1,11,C2(10)-SOUTHLAKE,,C3(15)-FLEET,,RR,RR,18G-011,,\n30-Jul,1:00 PM,\"A bracket A1,A2\",CARROL ISD 1,13,A1(1)-SEA MONSTERS PREMIER,,A2(12)-ALAMO,,RR,RR,18G-013,,\n30-Jul,1:50 PM,\"F bracket F1,F2\",CARROL ISD 1,14,F1(6)-KRAKEN,,F2(7)-PEGASUS,,RR,RR,18G-014,,\n30-Jul,2:40 PM,\" C bracket C1,C2\",CARROL ISD 1,17,C1(3)-NEW HAVEN HYDRAS,,C2(10)-SOUTHLAKE,,RR,RR,18G-017,,\n30-Jul,3:30 PM,Cross 2A/3B,CARROL ISD 1,19,2nd_A,,3rd_B,,pt_P3,pt_R1,18G-019,,\n30-Jul,4:20 PM,Cross 2F/3E,CARROL ISD 1,20,2nd_F,,3rd_E,,pt_N2,pt_S3,18G-020,,\n30-Jul,5:10 PM,Cross 2C/3D,CARROL ISD 1,23,2nd_C,,3rd_D,,pt_N3,pt_S2,18G-023,,\n,,,,,,,,,,,,,\n,,,CARROL ISD 2,,,,,,,,,,\nDate,Time,Type,Location,Gm #,White,S,Dark,S,W to #,L to #,GMID,,\n30-Jul,8:00 AM,\"B bracket B1,B3\",CARROL ISD 2,3,B1(2)-HOUSTON HYDRA,,B3(14)-BCWP,,RR,RR,18G-003,,\n30-Jul,8:50 AM,\"E bracket E1,E3\",CARROL ISD 2,4,E1(5)-SLAP,,E3(17)-LONGHORN WHITE,,RR,RR,18G-004,,\n30-Jul,9:40 AM,\"D bracket D2,D3\",CARROL ISD 2,6,D1(4)-VIPER PIGEONS,,D3(16)-STORM CYCLONES,,RR,RR,18G-006,,\n30-Jul,10:30 AM,\"B bracket B2,B3\",CARROL ISD 2,9,B2(11)-ZOO,,B3(14)-BCWP,,RR,RR,18G-009,,\n30-Jul,11:20 AM,\"E bracket E2,E3\",CARROL ISD 2,10,E2(8)-STORM TSUNAMIS,,E3(17)-LONGHORN WHITE,,RR,RR,18G-010,,\n30-Jul,12:10 PM,\"D bracket D1,D2\",CARROL ISD 2,12,D2(9)-ST LOUIS LIONS,,D3(16)-STORM CYCLONES,,RR,RR,18G-012,,\n30-Jul,1:00 PM,\"B bracket B1,B2\",CARROL ISD 2,15,B1(2)-HOUSTON HYDRA,,B2(11)-ZOO,,RR,RR,18G-015,,\n30-Jul,1:50 PM,\"E bracket E1,E2\",CARROL ISD 2,16,E1(5)-SLAP,,E2(8)-STORM TSUNAMIS,,RR,RR,18G-016,,\n30-Jul,2:40 PM,\"D bracket D1,D2\",CARROL ISD 2,18,D1(4)-VIPER PIGEONS,,D2(9)-ST LOUIS LIONS,,RR,RR,18G-018,,\n30-Jul,3:30 PM,Cross 2B/3A,CARROL ISD 2,21,2nd_B,,3rd_A,,pt_O3,pt_S1,18G-021,,\n30-Jul,4:20 PM,Cross 2E/3F,CARROL ISD 2,22,2nd_E,,3rd_F,,pt_M2,pt_R3,18G-022,,\n30-Jul,5:10 PM,Cross 2D/3C,CARROL ISD 2,24,2nd_D,,3rd_C,,pt_M3,pt_R2,18G-024,,\n,,,,,,,,,,,,,\n\"Fri, July 31\",,,,,,,,,,,,,\n,Platinum,,,,,,,,,,,,\n,M,N,O,P,,,,,,,,,\n1,pt_M1(1st_A),pt_N1(1st_B),pt_O1(1st_C),pt_P1(1st_D),,,,,,,,,\n2,pt_M2(W22),pt_N2(W20),pt_O2(1st_F),pt_P2(1st_E),,,,,,,,,\n3,pt_M3(W24),pt_N3(W23),pt_O3(W21),pt_P3(W19),,,,,,,,,\n,,,,,,,,,,,,,\n,R,S,,,,,,,,,,,\n,pt_R1(L19),pt_S1(L21),,,,,,,,,,,\n,pt_R2(L24),pt_S2(L23),,,,,,,,,,,\n,pt_R3(L22),pt_S3(L20),,,,,,,,,,,\n,,,,,,,,,,,,,\n,,,CARROL ISD 1,,MSR,,,,,,pt,au,\nDate,Time,Type,Location,Gm #,White,S,Dark,S,W to #,L to #,GMID,,\n31-Jul,8:00 AM,Group,CARROL ISD 1,65,pt_R1(L19),,pt_R2(L24),,,,18G-065,,pt_Group\n31-Jul,8:50 AM,Group,CARROL ISD 1,69,pt_M1(1st_A),,pt_M3(W24),,,,18G-069,,pt_Group\n31-Jul,9:40 AM,Group,CARROL ISD 1,73,pt_N1(1st_B),,pt_N3(W23),,,,18G-073,,pt_Group\n31-Jul,10:30 AM,Group,CARROL ISD 1,77,pt_R1(L19),,pt_R3(L22),,,,18G-077,,pt_Group\n31-Jul,11:20 AM,Group,CARROL ISD 1,79,pt_M2(W22),,pt_M3(W24),,,,18G-079,,pt_Group\n31-Jul,12:10 PM,Group,CARROL ISD 1,81,pt_N2(W20),,pt_N3(W23),,,,18G-081,,pt_Group\n31-Jul,1:00 PM,Group,CARROL ISD 1,83,pt_R2(L24),,pt_R3(L22),,,,18G-083,,pt_Group\n31-Jul,1:50 PM,Group,CARROL ISD 1,85,pt_M1(1st_A),,pt_M2(W22),,,,18G-085,,pt_Group\n31-Jul,2:40 PM,Group,CARROL ISD 1,89,pt_N1(1st_B),,pt_N3(W23),,,,18G-089,,pt_Group\n,,,,,,,,,,,,,\n31-Jul,4:20 PM,Play-in,CARROL ISD 1,109,3rd pt_M,,2nd pt_R,,133,au_W2,18G-109,,pt_Play-in\n31-Jul,5:10 PM,Play-in,CARROL ISD 1,113,3rd pt_N,,1st pt_R,,125,au_V3,18G-113,,pt_Play-in\n,,,,,,,,,,,,,\n,,,CARROL ISD 2,,,,,,,,,,\nDate,Time,Type,Location,Gm #,White,S,Dark,S,W to #,L to #,GMID,,\n31-Jul,8:00 AM,Group,CARROL ISD 2,66,pt_S1(L21),,pt_S2(L23),,,,18G-066,,pt_Group\n31-Jul,8:50 AM,Group,CARROL ISD 2,70,pt_O1(1st_C),,pt_O3(W21),,,,18G-070,,pt_Group\n31-Jul,9:40 AM,Group,CARROL ISD 2,74,pt_P1(1st_D),,pt_P3(W19),,,,18G-074,,pt_Group\n31-Jul,10:30 AM,Group,CARROL ISD 2,78,pt_S1(L21),,pt_S3(L20),,,,18G-078,,pt_Group\n31-Jul,11:20 AM,Group,CARROL ISD 2,80,pt_O2(1st_F),,pt_O3(W21),,,,18G-080,,pt_Group\n31-Jul,12:10 PM,Group,CARROL ISD 2,82,pt_P2(1st_E),,pt_P3(W19),,,,18G-082,,pt_Group\n31-Jul,1:00 PM,Group,CARROL ISD 2,84,pt_S2(L23),,pt_S3(L20),,,,18G-084,,pt_Group\n31-Jul,1:50 PM,Group,CARROL ISD 2,86,pt_O1(1st_C),,pt_O2(1st_F),,,,18G-086,,pt_Group\n31-Jul,2:40 PM,Group,CARROL ISD 2,90,pt_P1(1st_D),,pt_P2(1st_E),,,,18G-090,,pt_Group\n,,,,,,,,,,,,,\n31-Jul,4:20 PM,Play-in,CARROL ISD 2,110,3rd pt_O,,1st pt_S,,121,au_W3,18G-110,,pt_Play-in\n31-Jul,5:10 PM,Play-in,CARROL ISD 2,114,3rd pt_P,,2nd pt_S,,129,au_V2,18G-114,,pt_Play-in\n,,,,,,,,,,,,,\n,au_V Gold 1st-6th,au_W Gold 1st-6th,,,,,,,,,,,\n1,au_V1(3rd pt_R)-,au_W1(3rd pt_S)-,,,,,,,,,,,\n2,au_V2(L114),au_W2(L109),,,,,,,,,,,\n3,au_V3(L113),au_W3(L110),,,,,,,,,,,\n,,,,,,,,,,,,,\nDay 3,,,,,,,,,,,,,\n1-Aug,,,,,,,,,,,,,\n,,,,,,,,,,,,,\n,,,CARROL ISD 1,,,,,,,,,,\nDate,Time,Type,Location,Gm #,White,S,Dark,S,W to #,L to #,GMID,,\n1-Aug,8:00 AM,5-8 v 9-12,CARROL ISD 1,121,2nd pt_P,,W110,,145,153,18G-121,,pt_5-8 v 9-12\n1-Aug,9:00 AM,5-8 v 9-12,CARROL ISD 1,125,2nd pt_M,,W113,,145,153,18G-125,,pt_5-8 v 9-12\n1-Aug,10:00 AM,5-8 v 9-12,CARROL ISD 1,129,2nd pt_O,,W114,,149,157,18G-129,,pt_5-8 v 9-12\n1-Aug,11:00 AM,1-2 v 3-4,CARROL ISD 1,137,1st pt_N,,1st pt_O,,174,161,18G-137,,pt_1-2 v 3-4\n1-Aug,12:00 PM,1-2 v 3-4,CARROL ISD 1,141,1st pt_M,,1st pt_P,,173,165,18G-141,,pt_1-2 v 3-4\n1-Aug,1:00 PM,5-6 v 7-8,CARROL ISD 1,145,W121,,W125,,161,178,18G-145,,pt_5-6 v 7-8\n1-Aug,2:00 PM,9-12 semi,CARROL ISD 1,153,L125,,L121,,177,181,18G-153,,pt_9-12 semi\n1-Aug,3:00 PM,9-12 semi,CARROL ISD 1,157,L133,,L129,,177,181,18G-157,,pt_9-12 semi\n1-Aug,4:00 PM,play to semi,CARROL ISD 1,161,L137,,W145,,173,193,18G-161,,pt_play to semi\n,,,,,,,,,,,,,\n,,,CARROL ISD 2,,,,,,,,,,\nDate,Time,Type,Location,Gm #,White,S,Dark,S,W to #,L to #,GMID,,\n1-Aug,8:00 AM,Group,CARROL ISD 2,122,au_V1(3rd pt_R)-,,au_V3(L113),,,,18G-122,,au_Group\n1-Aug,9:00 AM,Group,CARROL ISD 2,126,au_W1(3rd pt_S)-,,au_W3(L110),,,,18G-126,,au_Group\n1-Aug,10:00 AM,5-8 v 9-12,CARROL ISD 2,133,2nd pt_N,,W109,,149,157,18G-133,,pt_5-8 v 9-12\n1-Aug,11:00 AM,Group,CARROL ISD 2,130,au_V2(L114),,au_V3(L113),,,,18G-130,,au_Group\n1-Aug,12:00 PM,Group,CARROL ISD 2,134,au_W2(L109),,au_W3(L110),,,,18G-134,,au_Group\n1-Aug,1:00 PM,5-6 v 7-8,CARROL ISD 2,149,W129,,W133,,165,178,18G-149,,pt_5-6 v 7-8\n1-Aug,2:00 PM,Group,CARROL ISD 2,138,au_V1(3rd pt_R)-,,au_V2(L114),,,,18G-138,,au_Group\n1-Aug,3:00 PM,Group,CARROL ISD 2,142,au_W1(3rd pt_S)-,,au_W2(L109),,,,18G-142,,au_Group\n1-Aug,4:00 PM,play to semi,CARROL ISD 2,165,L141,,W149,,174,193,18G-165,,pt_play to semi\n,,,,,,,,,,,,,\nDay 4,,,,,,,,,,,,,\n2-Aug,,,,,,,,,,,,,\n,,,CARROL ISD 1,,,,,,,,,,\nDate,Time,Type,Location,Gm #,White,S,Dark,S,W to #,L to #,GMID,,\n2-Aug,8:00 AM,5th,CARROL ISD 1,193,L161,,L165,,pt_5th,pt_6th,18G-193,,pt_5th\n2-Aug,9:00 AM,7th,CARROL ISD 1,178,L145,,L149,,pt_7th,pt_8th,18G-178,,pt_7th\n2-Aug,10:00 AM,3rd,CARROL ISD 1,191,2nd au_V,,2nd au_W,,au_3rd,au_4th,18G-191,,au_3rd\n2-Aug,11:00 AM,1st,CARROL ISD 1,182,1st au_V,,1st au_W,,au_1st,au_2nd,18G-182,,au_1st\n2-Aug,12:00 PM,9th,CARROL ISD 1,177,W153,,W157,,pt_9th,pt_10th,18G-177,,pt_9th\n2-Aug,1:00 PM,5th,CARROL ISD 1,192,3rd au_V,,3rd au_W,,au_5th,au_6th,18G-192,,au_5th\n2-Aug,2:00 PM,11th,CARROL ISD 1,181,L153,,L157,,pt_11th,pt_12th,18G-181,,pt_11th\n,,,,,,,,,,,,,\n,,,,,,,,,,,,,\n,,,GARLAND ISD 2,,,,,,,,,,\nDate,Time,Type,Location,Gm #,White,S,Dark,S,W to #,L to #,GMID,,\n2-Aug,8:30 AM,semi,GARLAND ISD 1,174,W137,,W165,,186,185,18G-174,,pt_semi\n,,,,,,,,,,,,,\n2-Aug,2:30 PM,3rd,GARLAND ISD 2,185,L173,,L174,,pt_3rd,pt_4th,18G-185,,pt_3rd\n,,,,,,,,,,,,,\n,,,GARLAND ISD 1,,,,,,,,,,\nDate,Time,Type,Location,Gm #,White,S,Dark,S,W to #,L to #,GMID,,\n2-Aug,8:30 AM,semi,GARLAND ISD 2,173,W141,,W161,,186,185,18G-173,,pt_semi\n,,,,,,,,,,,,,\n2-Aug,2:30 PM,1st,GARLAND ISD 1,186,W173,,W174,,pt_1st,pt_2nd,18G-186,,pt_1st\n,,,,,,,,,,,,,\n,,,,,,,,,,,,,\npt_Place,,au_Place,,,,,,,,,,,\n1st,W186,1st,W182,,,,,,,,,,\n2nd,L186,2nd,L182,,,,,,,,,,\n3rd,W185,3rd,W191,,,,,,,,,,\n4th,L185,4th,L191,,,,,,,,,,\n5th,W193,5th,W192,,,,,,,,,,\n6th,L193,6th,L192,,,,,,,,,,\n7th,W178,,,,,,,,,,,,\n8th,L178,,,,,,,,,,,,\n9th,W177,,,,,,,,,,,,\n10th,L177,,,,,,,,,,,,\n11th,W181,,,,,,,,,,,,\n12th,L181,,,,,,,,,,,,"};
const EMBEDDED_FALLBACKS={};
const RELAY_EVENT_ID='2026-jo-session-3';
const RELAY_BASE_URL='https://raw.githubusercontent.com/littlezip12/CPI/cpi-live-relay/data/tournaments/live-relay';
const RELAY_FETCH_TIMEOUT_MS=4500;
const RELAY_FRESH_MAX_AGE_MS=7*60*1000;
const REFRESH_MS=120000;
const ACTIVE_REFRESH_MIN_MS=30000;
const LIVE_FETCH_TIMEOUT_MS=5500;
const LIVE_JSONP_TIMEOUT_MS=6500;
const LIVE_HEDGE_DELAY_MS=650;
const LIVE_INITIAL_CANDIDATES=3;
const LIVE_RETRY_DELAYS_MS=[15000,30000,60000];
const PREFERRED_SOURCE_PREFIX='joTexasPreferredLiveV1:';
const CACHE_PREFIX='joTexasScheduleV1:';
const ACRONYMS=new Set(['SD','CDM','LB','CC','WPC','CHAWP','LOWPO','SHAQ','OCWPC','ECA','ASA','CMAC','TPC','WCAC','SET','LA','OC','USA','CIU']);
const age=$('age'),division=$('division'),team=$('team'),summary=$('summary'),next=$('next'),journey=$('journey'),paths=$('paths'),potential=$('potential'),schedule=$('schedule'),search=$('search'),day=$('day'),share=$('share');
let DATA={teams:[],games:[]},RESOLVED={games:[],map:new Map(),slots:new Map(),placements:new Map(),seedLookup:new Map()},loadVersion=0,refreshTimer=null,retryTimer=null,lastLoadAttemptAt=0;
const activeLoads=new Map(),liveFailureCounts=new Map();

function $(id){return document.getElementById(id)}
function esc(value){return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]))}
function currentConfig(){return DATASETS.find(d=>d.id===division.value)||null}
function identityContext(){const config=currentConfig();const label=String(config?.division||'');const gender=/girls/i.test(label)?'Girls':/boys/i.test(label)?'Boys':/coed/i.test(label)?'Coed':'';return{season:'2026',ageGroup:config?.age||'',gender}}
function canonicalIdentity(name){return window.CPIIdentity?.resolveTeam?.(name,identityContext())||null}
function identityAttributes(name){const identity=canonicalIdentity(name);return identity?` data-cpi-team-id="${esc(identity.id)}" data-cpi-club-id="${esc(identity.clubId)}"`:''}
function clubIdentityForName(name){
  const identity=canonicalIdentity(name);if(identity?.club?.logo)return identity.club;
  const resolver=window.CPIIdentity?.resolveClub;if(!resolver)return null;
  const clean=window.CPIIdentity?.cleanSourceName?.(name)||String(name||'').trim(),candidates=[clean];
  const add=value=>{const candidate=String(value||'').trim();if(candidate&&!candidates.includes(candidate))candidates.push(candidate)};
  add(clean.replace(/\s+\d{1,2}U(?:\s+(?:Boys|Girls|Coed))?\s*$/i,''));
  let stripped=clean;
  for(let i=0;i<2;i++){const next=stripped.replace(/\s+(?:A|B|C|D|Black|Blue|Red|White|Gold|Silver|Orange|Green|Premier|Navy|Gray|Grey)\s*$/i,'').trim();if(next===stripped)break;add(next);stripped=next}
  for(const candidate of candidates){const club=resolver(candidate);if(club?.logo)return club}
  return null;
}
function teamLogoHtml(name,size='game'){
  if(!SHOW_TEAM_LOGOS)return'';
  const club=clubIdentityForName(name),path=String(club?.logo||'').replace(/^\/+/, '');
  if(!/^assets\/logos\//.test(path))return'';
  const selected=size==='selected',className=`jo-team-logo${selected?' selected':''}`;
  return`<img class="${className}" src="../../${esc(path)}" alt="" aria-hidden="true" loading="${selected?'eager':'lazy'}" decoding="async" onerror="this.hidden=true">`;
}
function updateSheetLink(){
  const config=currentConfig(),link=$('sheetLink');
  if(!link)return;
  if(!config){link.href='#';link.setAttribute('aria-disabled','true');return;}
  link.href=config.officialUrl||`https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit`;
  link.setAttribute('aria-label',`View the official ${config.age} ${config.division} workbook in Google Sheets`);
  link.removeAttribute('aria-disabled');
}

function unique(values){return [...new Set(values.filter(Boolean).map(String))]}
function configuredSheetNames(config){return unique([config.sheetName,...(config.sheetNameAliases||[])])}
function datasetUrls(config){
  const root=`https://docs.google.com/spreadsheets/d/${SHEET_ID}`,urls=[];
  for(const name of configuredSheetNames(config)){
    urls.push(`${root}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(name)}`);
  }
  for(const gid of unique([config.gid,...(config.gidAliases||[])])){
    urls.push(`${root}/gviz/tq?tqx=out:csv&gid=${encodeURIComponent(gid)}`);
    urls.push(`${root}/export?format=csv&gid=${encodeURIComponent(gid)}`);
  }
  return unique(urls);
}
function jsonpUrls(config,callbackName){
  const root=`https://docs.google.com/spreadsheets/d/${SHEET_ID}`,urls=[];
  for(const name of configuredSheetNames(config))urls.push(`${root}/gviz/tq?tqx=out:json;responseHandler:${callbackName}&sheet=${encodeURIComponent(name)}`);
  for(const gid of unique([config.gid,...(config.gidAliases||[])]))urls.push(`${root}/gviz/tq?tqx=out:json;responseHandler:${callbackName}&gid=${encodeURIComponent(gid)}`);
  return unique(urls);
}
function exportUrl(config){return config.officialUrl||`https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit`}
function snapshotUrl(config){return config.snapshotPath||`../../data/tournaments/raw/2026-jo-session-3/${encodeURIComponent(config.id)}.csv`}

function normalizeHeader(value){return String(value||'').replace(/^\uFEFF/,'').trim().toLowerCase().replace(/\s+/g,' ')}
function parseCSV(text){let rows=[],row=[],cell='',quoted=false;for(let i=0;i<text.length;i++){const c=text[i],n=text[i+1];if(quoted){if(c==='"'&&n==='"'){cell+='"';i++}else if(c==='"')quoted=false;else cell+=c}else if(c==='"')quoted=true;else if(c===','){row.push(cell);cell=''}else if(c==='\n'){row.push(cell.replace(/\r$/,''));rows.push(row);row=[];cell=''}else cell+=c}if(cell||row.length){row.push(cell);rows.push(row)}return rows}
function scoreParts(value){const raw=String(value??'').trim();const m=raw.match(/^(\d+)(?:\.(\d+))?$/);return m?{raw,regulation:Number(m[1]),shootout:m[2]==null?null:Number(m[2])}:null}
function isScoreCell(value){return scoreParts(value)!==null}
function gameScoreParts(g){return{white:scoreParts(g?.whiteScore),dark:scoreParts(g?.darkScore)}}
function scoreOutcome(g){const p=gameScoreParts(g);if(!p.white||!p.dark)return null;if(p.white.regulation!==p.dark.regulation)return p.white.regulation>p.dark.regulation?'white':'dark';if(p.white.shootout!=null&&p.dark.shootout!=null&&p.white.shootout!==p.dark.shootout)return p.white.shootout>p.dark.shootout?'white':'dark';return null}
function scoreDisplay(g){const p=gameScoreParts(g);if(!p.white||!p.dark)return'';if(p.white.shootout!=null||p.dark.shootout!=null)return`${p.white.regulation}–${p.dark.regulation} (SO ${p.white.shootout??0}–${p.dark.shootout??0})`;return`${p.white.regulation}–${p.dark.regulation}`}
function headerIndex(row,names){const normalized=row.map(normalizeHeader);for(const name of names){const i=normalized.indexOf(name);if(i>=0)return i}return-1}
function headerMap(row){
  const date=headerIndex(row,['date']),time=headerIndex(row,['time']),type=headerIndex(row,['type','stage']),location=headerIndex(row,['location','venue']);
  const game=headerIndex(row,['gm #','gm#','game #','game','gm']),white=headerIndex(row,['white','team 1']),dark=headerIndex(row,['dark','team 2']);
  const winnerTo=headerIndex(row,['w to #','w to','winner to','win to']),loserTo=headerIndex(row,['l to #','l to','loser to','loss to']),gmid=headerIndex(row,['gmid','gm id','game id']);
  if([date,time,game,white,dark,gmid].some(i=>i<0))return null;
  const normalized=row.map(normalizeHeader);
  const whiteScore=normalized.findIndex((v,i)=>i>white&&i<dark&&(v==='s'||v==='score'));
  const darkScore=normalized.findIndex((v,i)=>i>dark&&(winnerTo<0||i<winnerTo)&&(v==='s'||v==='score'));
  const stageDetail=gmid>=0?gmid+2:-1;
  return{date,time,type,stageDetail,location,game,white,whiteScore,dark,darkScore,winnerTo,loserTo,gmid};
}
function normalizeGameNumber(value){const raw=String(value||'').trim().toUpperCase();return /^\d+$/.test(raw)?Number(raw):raw}
function validGameNumber(value){return /^\d+[A-Z]?$/.test(String(value||'').trim())}
function validGameId(value){return /^\d{2}[A-Z]+-\d+[A-Z]?$/i.test(String(value||'').trim())}
function gameNumberFromId(value){const match=String(value||'').trim().toUpperCase().match(/^\d{2}[A-Z]+-(\d+[A-Z]?)$/);return match?match[1]:''}
function mappedGame(row,map){
  const get=i=>i>=0?String(row[i]||'').trim():'';
  const gmid=get(map.gmid),date=get(map.date),time=get(map.time),gameRaw=get(map.game)||gameNumberFromId(gmid);
  if(!validGameNumber(gameRaw)||!validGameId(gmid)||!date||!time)return null;
  return{date,time,type:get(map.type),stageDetail:get(map.stageDetail),location:get(map.location),game:normalizeGameNumber(gameRaw),whiteRaw:get(map.white),whiteScore:get(map.whiteScore),darkRaw:get(map.dark),darkScore:get(map.darkScore),winnerTo:normalizeDestination(get(map.winnerTo)),loserTo:normalizeDestination(get(map.loserTo)),gmid};
}
function inferredGame(row){
  const cells=row.map(v=>String(v??'').trim());
  let gmidIndex=-1;
  for(let i=cells.length-1;i>=0;i--){if(validGameId(cells[i])){gmidIndex=i;break}}
  if(gmidIndex<0)return null;
  const gmid=cells[gmidIndex],derivedGame=gameNumberFromId(gmid);
  if(!derivedGame)return null;
  const dateIndex=cells.findIndex((v,i)=>i<gmidIndex&&(/^\d{1,2}-[A-Za-z]{3}$/.test(v)||/^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(v)));
  if(dateIndex<0)return null;
  const timeIndex=cells.findIndex((v,i)=>i>dateIndex&&i<gmidIndex&&/^\d{1,2}:\d{2}\s*(AM|PM)$/i.test(v));
  if(timeIndex<0)return null;
  const structuralGameIndex=gmidIndex-7;
  let gameIndex=structuralGameIndex>timeIndex?structuralGameIndex:-1;
  if(gameIndex<0||(!validGameNumber(cells[gameIndex])&&cells[gameIndex])){
    gameIndex=cells.findIndex((v,i)=>i>timeIndex&&i<gmidIndex&&validGameNumber(v));
  }
  if(gameIndex<0)return null;
  const gameRaw=validGameNumber(cells[gameIndex])?cells[gameIndex]:derivedGame;
  const destinationStart=gmidIndex-2;
  if(destinationStart<=gameIndex+1)return null;
  const participantIndices=[];
  for(let i=gameIndex+1;i<destinationStart;i++){
    const v=cells[i];
    if(v&&!isScoreCell(v))participantIndices.push(i);
  }
  if(participantIndices.length<2){
    for(let i=gameIndex+1;i<destinationStart&&participantIndices.length<2;i++)if(cells[i]&&!participantIndices.includes(i))participantIndices.push(i);
  }
  if(participantIndices.length<2)return null;
  const white=participantIndices[0],dark=participantIndices[1];
  const scoreBetween=cells.slice(white+1,dark).find(isScoreCell)||'';
  const scoreAfter=cells.slice(dark+1,destinationStart).find(isScoreCell)||'';
  return{
    date:cells[dateIndex],time:cells[timeIndex],type:cells[timeIndex+1]||'',stageDetail:cells[gmidIndex+2]||'',location:cells[gameIndex-1]||'',game:normalizeGameNumber(gameRaw),
    whiteRaw:cells[white],whiteScore:scoreBetween,darkRaw:cells[dark],darkScore:scoreAfter,
    winnerTo:normalizeDestination(cells[gmidIndex-2]),loserTo:normalizeDestination(cells[gmidIndex-1]),gmid
  };
}

function parseRows(rows){
  const games=[];let map=null;
  for(const row of rows){
    const candidate=headerMap(row);if(candidate){map=candidate;continue}
    const game=(map&&mappedGame(row,map))||inferredGame(row);
    if(game)games.push(game);
  }
  return dedupeGames(games);
}
function parseLive(text){return parseRows(parseCSV(String(text||'').replace(/^\uFEFF/,'')))}
function cellValue(cell){if(!cell)return'';if(cell.f!=null)return String(cell.f).trim();if(cell.v==null)return'';if(typeof cell.v==='string')return cell.v.trim();return String(cell.v).trim()}
function rowsFromGviz(payload){
  const table=payload&&payload.table;if(!table||!Array.isArray(table.rows))return[];
  return table.rows.map(row=>(row.c||[]).map(cellValue));
}
function fetchJsonp(url,timeoutMs=LIVE_JSONP_TIMEOUT_MS){
  return new Promise((resolve,reject)=>{
    const callback=`joJsonp_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const script=document.createElement('script');
    let timer,settled=false;
    function cleanup(){clearTimeout(timer);delete window[callback];script.remove()}
    window[callback]=(payload)=>{if(settled)return;settled=true;cleanup();resolve(payload)};
    timer=setTimeout(()=>{if(settled)return;settled=true;cleanup();reject(new Error('Google JSONP timeout'))},timeoutMs);
    script.onerror=()=>{if(settled)return;settled=true;cleanup();reject(new Error('Google JSONP failed'))};
    script.src=url.replace(/responseHandler:[^&]+/,`responseHandler:${callback}`);
    document.head.appendChild(script);
  });
}

function dedupeGames(games){const seen=new Map();for(const g of games)seen.set(`${g.gmid}|${g.game}`,g);return[...seen.values()]}
function looksLikeHtml(text){const start=String(text||'').trimStart().slice(0,160).toLowerCase();return start.startsWith('<!doctype')||start.startsWith('<html')||start.includes('<body')||start.includes('accounts.google.com')}

function validateGames(games){
  const teams=teamsFromGames(games);
  if(games.length<5||teams.length<2)throw new Error(`Only ${games.length} games and ${teams.length} teams returned`);
  return{games,teams};
}
function datasetProgress(games){
  const list=Array.isArray(games)?games:[];
  let finalGames=0,scoreCells=0;
  for(const game of list){
    if(String(game?.whiteScore||'').trim())scoreCells+=1;
    if(String(game?.darkScore||'').trim())scoreCells+=1;
    if(scoreOutcome(game)!==null)finalGames+=1;
  }
  return{finalGames,scoreCells,games:list.length};
}
function datasetIsOlder(candidateGames,currentGames){
  const candidate=datasetProgress(candidateGames),current=datasetProgress(currentGames);
  if(!current.games)return false;
  if(candidate.finalGames!==current.finalGames)return candidate.finalGames<current.finalGames;
  if(candidate.scoreCells!==current.scoreCells)return candidate.scoreCells<current.scoreCells;
  return candidate.games<current.games;
}
async function fetchVerifiedSnapshot(config){
  const url=snapshotUrl(config),controller=typeof AbortController==='function'?new AbortController():null;
  const timer=setTimeout(()=>controller?.abort(),LIVE_FETCH_TIMEOUT_MS);
  try{
    const response=await fetch(`${url}${url.includes('?')?'&':'?'}_=${Date.now()}`,{cache:'no-store',signal:controller?.signal});
    if(!response.ok)throw new Error(`Snapshot HTTP ${response.status}`);
    const text=await response.text();if(looksLikeHtml(text))throw new Error('Snapshot returned HTML instead of CSV');
    const result=validateGames(parseLive(text));result.url=url;result.method='verified snapshot';result.isFallback=true;result.updatedAt=response.headers?.get?.('last-modified')||config.snapshotUpdatedAt||null;return result;
  }catch(error){if(error?.name==='AbortError')throw new Error('Verified snapshot timeout');throw error}
  finally{clearTimeout(timer)}
}

function relayFileUrl(config,kind){
  const suffix=kind==='status'?`status/${RELAY_EVENT_ID}/${encodeURIComponent(config.id)}.json`:`${RELAY_EVENT_ID}/${encodeURIComponent(config.id)}.csv`;
  return `${RELAY_BASE_URL}/${suffix}`;
}
function relayStatusFresh(status){
  const checked=Date.parse(status?.checkedAt||status?.lastSuccessAt||'');
  return status?.state==='live'&&Number.isFinite(checked)&&(Date.now()-checked)<=RELAY_FRESH_MAX_AGE_MS;
}
async function fetchRelayDataset(config){
  const controller=typeof AbortController==='function'?new AbortController():null;
  const timer=setTimeout(()=>controller?.abort(),RELAY_FETCH_TIMEOUT_MS),nonce=Date.now();
  try{
    const options={cache:'no-store',signal:controller?.signal,headers:{Accept:'application/json,text/csv,text/plain,*/*'}};
    const [statusResponse,csvResponse]=await Promise.all([
      fetch(`${relayFileUrl(config,'status')}?_=${nonce}`,options),
      fetch(`${relayFileUrl(config,'csv')}?_=${nonce}`,options)
    ]);
    if(!statusResponse.ok)throw new Error(`Relay status HTTP ${statusResponse.status}`);
    if(!csvResponse.ok)throw new Error(`Relay CSV HTTP ${csvResponse.status}`);
    const [status,text]=await Promise.all([statusResponse.json(),csvResponse.text()]);
    if(status?.eventId!==RELAY_EVENT_ID||status?.divisionId!==config.id)throw new Error('Relay metadata does not match the selected division');
    if(looksLikeHtml(text))throw new Error('Relay returned HTML instead of CSV');
    const result=validateGames(parseLive(text));
    result.url=relayFileUrl(config,'csv');
    result.method='WPI live relay';
    result.sourceLabel='WPI live relay';
    result.updatedAt=status.lastSuccessAt||status.contentUpdatedAt||status.checkedAt||null;
    result.checkedAt=status.checkedAt||null;
    result.isRelay=true;
    result.isFallback=!relayStatusFresh(status);
    result.relayStatus=status;
    return result;
  }catch(error){
    if(error?.name==='AbortError')throw new Error('WPI live relay timeout');
    throw error;
  }finally{clearTimeout(timer)}
}
function endpointMethod(kind,url){const route=url.includes('sheet=')?'sheet-name':url.includes('/export?')?'export':'GID';return`${route} ${kind.toUpperCase()}`}
function preferredEndpointKey(config){return`${PREFERRED_SOURCE_PREFIX}${config.id}`}
function readPreferredLiveEndpoint(config){try{const value=JSON.parse(localStorage.getItem(preferredEndpointKey(config))||'null');return value&&value.kind&&value.url?value:null}catch{return null}}
function writePreferredLiveEndpoint(config,candidate){try{localStorage.setItem(preferredEndpointKey(config),JSON.stringify({kind:candidate.kind,url:candidate.url,method:candidate.method,verifiedAt:new Date().toISOString()}))}catch{}}
function liveEndpointCandidates(config){
  const csv=datasetUrls(config).map(url=>({kind:'csv',url,method:endpointMethod('csv',url)}));
  const jsonp=jsonpUrls(config,'__CALLBACK__').map(url=>({kind:'jsonp',url,method:endpointMethod('jsonp',url)}));
  const all=[...csv.filter(c=>c.url.includes('sheet=')),...jsonp.filter(c=>c.url.includes('sheet=')),...csv.filter(c=>!c.url.includes('sheet=')&&!c.url.includes('/export?')),...jsonp.filter(c=>!c.url.includes('sheet=')),...csv.filter(c=>c.url.includes('/export?'))];
  const preferred=readPreferredLiveEndpoint(config),ordered=preferred?[preferred,...all]:all,seen=new Set();
  return ordered.filter(candidate=>{const key=`${candidate.kind}|${candidate.url}`;if(seen.has(key))return false;seen.add(key);return true});
}
async function fetchCsvCandidate(candidate){
  const controller=typeof AbortController==='function'?new AbortController():null;
  const timer=setTimeout(()=>controller?.abort(),LIVE_FETCH_TIMEOUT_MS);
  try{
    const url=`${candidate.url}${candidate.url.includes('?')?'&':'?'}_=${Date.now()}`;
    const response=await fetch(url,{cache:'no-store',redirect:'follow',signal:controller?.signal});
    if(!response.ok)throw new Error(`HTTP ${response.status}`);
    const text=await response.text();if(looksLikeHtml(text))throw new Error('Google returned HTML instead of CSV');
    return validateGames(parseLive(text));
  }catch(error){if(error?.name==='AbortError')throw new Error('Google CSV timeout');throw error}
  finally{clearTimeout(timer)}
}
async function loadLiveCandidate(candidate){
  if(candidate.kind==='csv')return fetchCsvCandidate(candidate);
  const payload=await fetchJsonp(candidate.url);
  if(payload&&payload.status==='error')throw new Error(payload.errors?.map(e=>e.detailed_message||e.message).join('; ')||'Google returned query error');
  return validateGames(parseRows(rowsFromGviz(payload)));
}
function hedgedFirstSuccess(candidates,loader,hedgeDelayMs=LIVE_HEDGE_DELAY_MS,initialCount=LIVE_INITIAL_CANDIDATES){
  return new Promise((resolve,reject)=>{
    const queue=[...candidates],errors=[];let pending=0,settled=false,waveTwoStarted=false,hedgeTimer=null;
    const first=queue.splice(0,Math.max(1,initialCount));
    function finishFailure(){if(settled||pending)return;if(!waveTwoStarted&&queue.length){startWaveTwo();return}settled=true;clearTimeout(hedgeTimer);reject(new Error(errors.slice(-8).join(' | ')||'No live Google endpoint succeeded'))}
    function start(candidate){pending+=1;Promise.resolve().then(()=>loader(candidate)).then(result=>{if(settled)return;settled=true;clearTimeout(hedgeTimer);resolve({candidate,result})}).catch(error=>{errors.push(`${candidate.method}: ${error?.message||String(error)}`);pending-=1;finishFailure()})}
    function startWaveTwo(){if(waveTwoStarted||settled)return;waveTwoStarted=true;clearTimeout(hedgeTimer);while(queue.length)start(queue.shift());finishFailure()}
    first.forEach(start);
    if(queue.length)hedgeTimer=setTimeout(startWaveTwo,hedgeDelayMs);else waveTwoStarted=true;
    finishFailure();
  });
}
async function fetchDataset(config){
  const started=Date.now(),candidates=liveEndpointCandidates(config);
  if(!candidates.length)throw new Error('No live Google endpoints are configured');
  const {candidate,result}=await hedgedFirstSuccess(candidates,loadLiveCandidate);
  result.url=candidate.url;result.method=candidate.method;result.updatedAt=new Date().toISOString();result.latencyMs=Date.now()-started;
  writePreferredLiveEndpoint(config,candidate);
  return result;
}
function normalizeDestination(value){let v=String(value||'').trim();let m=v.match(/^[WL]-?(\d+[A-Z]?)$/i);if(m)return m[1].toUpperCase();m=v.match(/^[WL]-?([a-z]{2}_[A-Z]\d)$/i);if(m)return m[1];return v.replace(/-$/,'')}
function titleTeam(name){return String(name||'').trim().replace(/\(Seed-Team Name\)$/i,'').trim().split(/\s+/).map(word=>{const upper=word.toUpperCase();if(ACRONYMS.has(upper))return upper;if(/^\d+$/.test(word))return word;return word.charAt(0).toUpperCase()+word.slice(1).toLowerCase()}).join(' ')}
function seedInfo(raw){
  const value=String(raw||'').trim(),dash=value.indexOf('-');if(dash<1)return null;
  const prefix=value.slice(0,dash).replace(/\s+/g,''),name=value.slice(dash+1).trim();
  if(/^[WL]#?\d+[A-Z]?$/i.test(prefix))return null;
  if(!name||!(/^[A-Z]\d?\(\d+\)$/i.test(prefix)||/^[A-Z]\(\d+\)$/i.test(prefix)||/^[A-Z]\d+$/i.test(prefix)||/^\d+$/.test(prefix)))return null;
  const group=/^[A-Z]/i.test(prefix)?prefix[0].toUpperCase():null;
  const seedMatch=prefix.match(/\((\d+)\)$/)||prefix.match(/^[A-Z](\d+)$/i)||prefix.match(/^(\d+)$/);return{team:titleTeam(name),group,seed:seedMatch?Number(seedMatch[1]):999};
}
function smartTeam(raw){return seedInfo(raw)?.team||null}
function teamIdentityKey(value){return titleTeam(value).toLowerCase().replace(/[’']/g,"'").replace(/[^a-z0-9]+/g,' ').trim()}
function structuredParticipantPrefix(raw){
  const value=String(raw||'').trim().replace(/\s+/g,' ');
  return /^(?:\d+|[A-Z]\d+(?:\(\d+\))?|[A-Z]\(\d+\)|[WL]#?\d+[A-Z]?|[WL]#?[A-Z]{1,2}\d+\/[A-Z]{1,2}\d+|[A-Za-z]{2,3}[_\s(]?[A-Z]{1,2}\d+(?:\([^)]*\))*|(?:\d{1,2}(?:st|nd|rd|th))\s*(?:\(afterRR\)|(?:[A-Za-z]{2,3}[_\s-]?)?[A-Z]{1,2}(?:\([^)]*\))*)?)$/i.test(value)
}
function routeAssignmentCandidate(raw){
  const value=String(raw||'').trim(),patterns=[
    /^([WL]#?(?:\d+[A-Z]?|[A-Z]{1,2}\d+\/[A-Z]{1,2}\d+))\s*[-–—:]\s*(.+)$/i,
    /^([A-Za-z]{2,3}[_\s(]?[A-Z]{1,2}\d+(?:\([^)]*\))*)\s*[-–—:]\s*(.+)$/i,
    /^((?:\d{1,2}(?:st|nd|rd|th))\s*(?:\(afterRR\)|(?:[A-Za-z]{2,3}[_\s-]?)?[A-Z]{1,2}(?:\([^)]*\))*)?)\s*[-–—:]\s*(.+)$/i,
    /^([A-Z]\d+(?:\(\d+\))?|\d+)\s*[-–—:]\s*(.+)$/i
  ];
  for(const pattern of patterns){const match=value.match(pattern);if(match&&match[2]?.trim())return titleTeam(match[2])}
  return null
}
function assignedRouteTeam(raw,knownTeams=DATA?.teams||[]){
  const value=String(raw||'').trim(),teams=[...(knownTeams||[])].filter(Boolean).sort((a,b)=>String(b).length-String(a).length);
  for(const separator of ['-','–','—',':']){let index=value.indexOf(separator);while(index>=0){const prefix=value.slice(0,index).trim(),suffix=value.slice(index+separator.length).trim(),key=teamIdentityKey(suffix);if(prefix&&key&&structuredParticipantPrefix(prefix)){const found=teams.find(name=>teamIdentityKey(name)===key);if(found)return found}index=value.indexOf(separator,index+separator.length)}}
  const candidate=routeAssignmentCandidate(value);if(!candidate)return null;
  const key=teamIdentityKey(candidate);if(!key)return null;
  return teams.find(name=>teamIdentityKey(name)===key)||null
}
function parseWL(raw){const m=String(raw||'').trim().match(/^([WL])#?(\d+[A-Z]?)(?:\s*[-–—:]\s*.*)?$/i);return m?{kind:m[1].toUpperCase(),game:normalizeGameNumber(m[2])}:null}
function normalizeRouteToken(raw){return String(raw||'').trim().replace(/\s+/g,'').replace(/^([A-Za-z]{2,3})\(/,'$1_').replace(/[-–—:]+$/,'')}
function parsePoolSlot(raw){const value=normalizeRouteToken(raw),m=value.match(/^([A-Za-z]{2,3})_?([A-Z]{1,2})(\d+)(?:\([^)]*\))*(?:[-–—:].*)?$/i);return m?{track:m[1].toLowerCase(),pool:m[2].toUpperCase(),seed:Number(m[3]),key:`${m[1].toLowerCase()}_${m[2].toUpperCase()}${m[3]}`} : null}
function parsePoolPlacement(raw){const value=String(raw||'').trim().replace(/_/g,' '),m=value.match(/^(1st|2nd|3rd|4th|5th)\s*([A-Za-z]{2,3})\s*([A-Z]{1,2})(?:\s*\([^)]*\))*(?:\s*[-–—:]\s*.*)?$/i);return m?{rank:Number(m[1][0]),track:m[2].toLowerCase(),pool:m[3].toUpperCase(),key:`${m[2].toLowerCase()}_${m[3].toUpperCase()}`} : null}
function parseGroupPlacement(raw){const value=String(raw||'').trim().replace(/_/g,' '),m=value.match(/^(1st|2nd|3rd|4th|5th)\s*([A-Z]{1,2})(?:\s*\([^)]*\))*(?:\s*[-–—:]\s*.*)?$/i);return m?{rank:Number(m[1][0]),group:m[2].toUpperCase(),key:m[2].toUpperCase()}:null}
function parsePoolMatchup(raw){const value=normalizeRouteToken(raw),m=value.match(/^([WL])#?([A-Z]{1,2}\d+)\/([A-Z]{1,2}\d+)(?:[-–—:].*)?$/i);return m?{kind:m[1].toUpperCase(),refs:[m[2].toUpperCase(),m[3].toUpperCase()].sort()}:null}
function poolSlotRef(raw){const slot=parsePoolSlot(raw);return slot?`${slot.pool}${slot.seed}`:null}
function poolMatchupMatchesGame(game,matchup){if(!game||!matchup)return false;const refs=[poolSlotRef(game.whiteRaw),poolSlotRef(game.darkRaw)].filter(Boolean).sort();return refs.length===2&&refs[0]===matchup.refs[0]&&refs[1]===matchup.refs[1]}
function routeTrackForGame(game){const match=String(game?.stageDetail||game?.type||'').trim().match(/^([a-z]{2,3})[_-]/i);return match?match[1].toLowerCase():null}
function sourceGamesForPoolMatchup(games,matchup,targetGame=null){const matches=(games||[]).filter(game=>poolMatchupMatchesGame(game,matchup));const track=routeTrackForGame(targetGame);return track?[...matches].sort((a,b)=>{const aTrack=parsePoolSlot(a.whiteRaw)?.track===track?0:1,bTrack=parsePoolSlot(b.whiteRaw)?.track===track?0:1;return aTrack-bTrack||gameSort(a,b)}):matches.sort(gameSort)}
function ordinalLabel(rank){return rank===1?'1st':rank===2?'2nd':rank===3?'3rd':`${rank}th`}
function trackLabel(track){return TRACK_LABELS[String(track||'').toLowerCase()]||String(track||'').toUpperCase()}
function slotLabel(raw){const team=smartTeam(raw)||assignedRouteTeam(raw);if(team)return team;const wl=parseWL(raw);if(wl)return`${wl.kind==='W'?'Winner':'Loser'} of Game ${wl.game}`;const matchup=parsePoolMatchup(raw);if(matchup)return`${matchup.kind==='W'?'Winner':'Loser'} of ${matchup.refs.join(' vs ')} matchup`;const slot=parsePoolSlot(raw);if(slot)return`${trackLabel(slot.track)} Pool ${slot.pool} Seed ${slot.seed}`;const pp=parsePoolPlacement(raw);if(pp)return`${ordinalLabel(pp.rank)} in ${trackLabel(pp.track)} Pool ${pp.pool}`;const gp=parseGroupPlacement(raw);if(gp)return`${ordinalLabel(gp.rank)} in Group ${gp.group}`;return String(raw||'').replace(/_/g,' ')||'TBD'}
function teamsFromGames(games){return[...new Set(games.flatMap(g=>[smartTeam(g.whiteRaw),smartTeam(g.darkRaw)]).filter(Boolean))].sort((a,b)=>a.localeCompare(b))}
function embeddedFallback(config){if(!config)return null;if(!EMBEDDED_FALLBACKS[config.id]){const csv=EMBEDDED_SNAPSHOT_CSV[config.id];if(!csv)return null;try{const games=parseLive(csv);EMBEDDED_FALLBACKS[config.id]={age:config.age,division:config.division,teams:teamsFromGames(games),games}}catch(error){console.error(`Could not initialize embedded Boys JO snapshot ${config.id}`,error);return null}}return structuredClone(EMBEDDED_FALLBACKS[config.id])}
function isFinal(g){return scoreOutcome(g)!==null}
function outcome(g){if(!g)return null;const side=scoreOutcome(g);if(!side||!g.whiteTeam||!g.darkTeam)return null;return side==='white'?{winner:g.whiteTeam,loser:g.darkTeam}:{winner:g.darkTeam,loser:g.whiteTeam}}
function rankTable(teamNames,games,seedLookup){
  const table=new Map(teamNames.map(t=>[t,{team:t,wins:0,gd:0,gf:0,seed:seedLookup.get(t)??999}]));
  for(const g of games){if(!isFinal(g)||!g.whiteTeam||!g.darkTeam)continue;for(const t of [g.whiteTeam,g.darkTeam])if(!table.has(t))table.set(t,{team:t,wins:0,gd:0,gf:0,seed:seedLookup.get(t)??999});const parts=gameScoreParts(g),ws=parts.white.regulation,ds=parts.dark.regulation,w=table.get(g.whiteTeam),d=table.get(g.darkTeam);w.gf+=ws;w.gd+=ws-ds;d.gf+=ds;d.gd+=ds-ws;(scoreOutcome(g)==='white'?w:d).wins++}
  return[...table.values()].sort((a,b)=>b.wins-a.wins||b.gd-a.gd||b.gf-a.gf||a.seed-b.seed||a.team.localeCompare(b.team)).map(x=>x.team)
}
function resolveTournament(){
  const knownTeams=Array.isArray(DATA.teams)?DATA.teams:teamsFromGames(DATA.games);
  const games=DATA.games.map(g=>({...g,whiteTeam:smartTeam(g.whiteRaw)||assignedRouteTeam(g.whiteRaw,knownTeams),darkTeam:smartTeam(g.darkRaw)||assignedRouteTeam(g.darkRaw,knownTeams)})),map=new Map(games.map(g=>[g.game,g])),slots=new Map(),groupPlacements=new Map(),poolPlacements=new Map();
  const seedLookup=new Map();for(const g of games){for(const raw of [g.whiteRaw,g.darkRaw]){const info=seedInfo(raw);if(info)seedLookup.set(info.team,info.seed)}}
  for(const g of games){for(const side of ['white','dark']){const raw=g[`${side}Raw`],teamName=g[`${side}Team`]||assignedRouteTeam(raw,knownTeams);if(!teamName)continue;const slot=parsePoolSlot(raw),pp=parsePoolPlacement(raw),gp=parseGroupPlacement(raw);if(slot&&!slots.has(slot.key))slots.set(slot.key,teamName);if(pp&&!poolPlacements.has(`${pp.key}:${pp.rank}`))poolPlacements.set(`${pp.key}:${pp.rank}`,teamName);if(gp&&!groupPlacements.has(`${gp.key}:${gp.rank}`))groupPlacements.set(`${gp.key}:${gp.rank}`,teamName)}}
  let changed=true,guard=0;
  while(changed&&guard++<50){changed=false;
    for(const g of games){for(const side of ['white','dark']){const key=`${side}Team`,raw=g[`${side}Raw`];if(g[key])continue;const assigned=assignedRouteTeam(raw,knownTeams);if(assigned){g[key]=assigned;const slot=parsePoolSlot(raw),pp=parsePoolPlacement(raw),gp=parseGroupPlacement(raw);if(slot&&!slots.has(slot.key))slots.set(slot.key,assigned);if(pp&&!poolPlacements.has(`${pp.key}:${pp.rank}`))poolPlacements.set(`${pp.key}:${pp.rank}`,assigned);if(gp&&!groupPlacements.has(`${gp.key}:${gp.rank}`))groupPlacements.set(`${gp.key}:${gp.rank}`,assigned);changed=true;continue}const wl=parseWL(raw);if(wl){const src=map.get(wl.game),o=outcome(src);if(o){g[key]=wl.kind==='W'?o.winner:o.loser;changed=true;continue}}const matchup=parsePoolMatchup(raw);if(matchup){const src=sourceGamesForPoolMatchup(games,matchup,g).find(isFinal),o=outcome(src);if(o){g[key]=matchup.kind==='W'?o.winner:o.loser;changed=true;continue}}const slot=parsePoolSlot(raw);if(slot&&slots.has(slot.key)){g[key]=slots.get(slot.key);changed=true;continue}const pp=parsePoolPlacement(raw);if(pp&&poolPlacements.has(`${pp.key}:${pp.rank}`)){g[key]=poolPlacements.get(`${pp.key}:${pp.rank}`);changed=true;continue}const gp=parseGroupPlacement(raw);if(gp&&groupPlacements.has(`${gp.key}:${gp.rank}`)){g[key]=groupPlacements.get(`${gp.key}:${gp.rank}`);changed=true}}}
    for(const g of games){const o=outcome(g);if(!o)continue;for(const [dest,teamName] of [[g.winnerTo,o.winner],[g.loserTo,o.loser]]){const slot=parsePoolSlot(dest);if(slot&&!slots.has(slot.key)){slots.set(slot.key,teamName);changed=true}}}
    const groups=new Map();for(const g of games){const wi=seedInfo(g.whiteRaw),di=seedInfo(g.darkRaw);if(!wi||!di||!wi.group||wi.group!==di.group)continue;const key=wi.group;if(!groups.has(key))groups.set(key,{games:[],teams:new Set()});groups.get(key).games.push(g);groups.get(key).teams.add(wi.team);groups.get(key).teams.add(di.team)}
    for(const [group,bucket] of groups){if(!bucket.games.length||!bucket.games.every(isFinal))continue;const ranked=rankTable([...bucket.teams],bucket.games,seedLookup);ranked.slice(0,5).forEach((teamName,i)=>{const key=`${group}:${i+1}`;if(!groupPlacements.has(key)){groupPlacements.set(key,teamName);changed=true}})}
    const pools=new Map();for(const g of games){const w=parsePoolSlot(g.whiteRaw),d=parsePoolSlot(g.darkRaw);if(!w||!d||w.track!==d.track||w.pool!==d.pool)continue;const key=`${w.track}_${w.pool}`;if(!pools.has(key))pools.set(key,{games:[],teams:new Set()});pools.get(key).games.push(g);if(g.whiteTeam)pools.get(key).teams.add(g.whiteTeam);if(g.darkTeam)pools.get(key).teams.add(g.darkTeam)}
    for(const [key,bucket] of pools){if(!bucket.games.length||!bucket.games.every(isFinal))continue;const ranked=rankTable([...bucket.teams],bucket.games,seedLookup);ranked.slice(0,5).forEach((teamName,i)=>{const placementKey=`${key}:${i+1}`;if(!poolPlacements.has(placementKey)){poolPlacements.set(placementKey,teamName);changed=true}})}
  }
  const teamGames=new Map();for(const g of games){for(const teamName of [g.whiteTeam,g.darkTeam]){if(!teamName)continue;if(!teamGames.has(teamName))teamGames.set(teamName,[]);teamGames.get(teamName).push(g)}}for(const list of teamGames.values())list.sort(gameSort);return{games,map,slots,placements:new Map([...groupPlacements,...poolPlacements]),seedLookup,teamGames,journeyCache:new Map()}
}
function display(g,side){return g?.[`${side}Team`]||slotLabel(g?.[`${side}Raw`])}
function seedForTeam(name){const seed=RESOLVED?.seedLookup?.get(name);return Number.isInteger(seed)&&seed>0&&seed<999?seed:null}
function seedBadgeHtml(name,context=''){const seed=seedForTeam(name);return seed?`<span class="jo-seed-badge${context==='dark'?' on-dark':''}" aria-label="JO division seed ${seed}" title="JO division seed ${seed}">#${seed}</span>`:''}
function teamLabelHtml(name,context='',showLogo=true){const label=String(name||'TBD'),logo=showLogo?teamLogoHtml(label):'';return`<span class="jo-team-label${logo?' has-logo':''}"${identityAttributes(label)}>${seedBadgeHtml(label,context)}${logo}<span class="jo-team-name">${esc(label)}</span></span>`}
function teamJumpHtml(name,context='',showLogo=true){const label=String(name||'TBD'),logo=showLogo?teamLogoHtml(label):'';return`<button type="button" class="jo-team-jump${context==='dark'?' on-dark':''}" data-team-jump="${esc(label)}" aria-label="Open ${esc(label)} team journey"${identityAttributes(label)}>${seedBadgeHtml(label,context)}${logo}<span class="jo-team-name">${esc(label)}</span></button>`}
function participantHtml(g,side,context=''){const known=g?.[`${side}Team`];return known?teamJumpHtml(known,context):`<span class="jo-team-label unresolved"><span class="jo-team-name">${esc(slotLabel(g?.[`${side}Raw`]))}</span></span>`}
function matchupHtml(g,context=''){const final=isFinal(g);return`<div class="jo-matchup${final?' is-final':''}${context==='dark'?' on-dark':''}"><div class="jo-match-participant">${participantHtml(g,'white',context)}</div><div class="jo-match-center">${final?`<span class="score">${esc(scoreDisplay(g))}</span>`:'<span class="jo-versus">vs</span>'}</div><div class="jo-match-participant">${participantHtml(g,'dark',context)}</div></div>`}
function candidateLabelsHtml(names,context=''){const uniqueNames=[...new Set((names||[]).filter(Boolean))];if(!uniqueNames.length)return'<span class="jo-team-label unresolved"><span class="jo-team-name">TBD</span></span>';return`<span class="jo-candidate-list">${uniqueNames.map(name=>teamJumpHtml(name,context)).join('<span class="jo-or">or</span>')}</span>`}
function namedMatchupHtml(name,opponent,candidates=[],context='dark'){const right=opponent?teamJumpHtml(opponent,context):candidateLabelsHtml(candidates,context);return`<div class="jo-next-matchup">${teamJumpHtml(name,context)}<span class="jo-match-separator">vs</span>${right}</div>`}
function teamOptionLabel(name){const seed=seedForTeam(name);return seed?`${name} — JO seed #${seed}`:name}

function friendlyStage(game){
  const detail=String(game?.stageDetail||'').trim();
  const match=detail.match(/^([a-z]{2,3})[_-](.+)$/i);
  const code=match?match[1].toLowerCase():'';
  const round=roundOnlyLabel(game);
  const bracket=code?trackLabel(code):'';
  return[bracket,round].filter(Boolean).join(' · ')||String(game?.type||'').trim()||detail;
}
function friendlyDate(raw){const labels={'18-Jul':'Saturday, July 18','19-Jul':'Sunday, July 19','20-Jul':'Monday, July 20','21-Jul':'Tuesday, July 21','30-Jul':'Thursday, July 30','31-Jul':'Friday, July 31','1-Aug':'Saturday, August 1','2-Aug':'Sunday, August 2'};return labels[raw]||raw}
function venueSearchQuery(location){const raw=String(location||'').trim();if(!raw)return'';const cleaned=raw.replace(/^CARROL\s+ISD/i,'Carroll ISD').replace(/^LEWISVILLE\s+ISD/i,'LISD');return`${cleaned}, North Texas water polo`;}
function venueLinksHtml(location){const label=String(location||'').trim();if(!label)return'';const query=encodeURIComponent(venueSearchQuery(label));const google=`https://www.google.com/maps/dir/?api=1&amp;destination=${query}&amp;travelmode=driving`;const apple=`https://maps.apple.com/?daddr=${query}&amp;dirflg=d`;const waze=`https://waze.com/ul?q=${query}&amp;navigate=yes&amp;utm_source=water_polo_index`;return`<span class="jo-venue-row"><a class="jo-venue-link" href="${google}" target="_blank" rel="noopener" aria-label="Open directions to ${esc(label)} in Google Maps">${esc(label)}</a><span class="jo-map-links"><a class="jo-map-link" href="${google}" target="_blank" rel="noopener">Google</a><a class="jo-map-link" href="${apple}" target="_blank" rel="noopener">Apple</a><a class="jo-map-link" href="${waze}" target="_blank" rel="noopener">Waze</a></span></span>`;}
function timeValue(value){const m=String(value||'').match(/^(\d+):(\d+)\s*(AM|PM)$/i);if(!m)return 9999;let h=Number(m[1])%12;if(m[3].toUpperCase()==='PM')h+=12;return h*60+Number(m[2])}
function dateValue(raw){const m=String(raw||'').match(/^(\d{1,2})-([A-Za-z]{3})$/);if(!m)return 999;const months={Jan:1,Feb:2,Mar:3,Apr:4,May:5,Jun:6,Jul:7,Aug:8,Sep:9,Oct:10,Nov:11,Dec:12};return(months[m[2]]||99)*100+Number(m[1])}
function gameSort(a,b){return dateValue(a.date)-dateValue(b.date)||timeValue(a.time)-timeValue(b.time)||String(a.game).localeCompare(String(b.game),undefined,{numeric:true,sensitivity:'base'})}
function routedGamesForTeam(name){
  if(!name||!RESOLVED)return[];
  if(RESOLVED.journeyCache?.has(name))return RESOLVED.journeyCache.get(name);
  const clones=new Map(RESOLVED.games.map(g=>[String(g.game),{...g}])),included=new Set();
  for(const g of clones.values())if(g.whiteTeam===name||g.darkTeam===name)included.add(String(g.game));
  let changed=true,guard=0;
  while(changed&&guard++<60){changed=false;
    for(const gameKey of [...included]){
      const source=clones.get(gameKey);if(!source||!isFinal(source))continue;
      const result=resultFor(source,name);if(!result)continue;
      const routeKind=result==='win'?'W':'L',destination=result==='win'?source.winnerTo:source.loserTo;
      if(!destination)continue;
      for(const targetBase of destinationTargets(destination)){
        const target=clones.get(String(targetBase.game));if(!target)continue;
        let ownSide=['white','dark'].find(side=>target[`${side}Team`]===name)||null;
        if(!ownSide){for(const side of ['white','dark'])if(pathSideMatches(target[`${side}Raw`],destination,source,routeKind)){ownSide=side;break}}
        if(!ownSide)continue;
        if(!target[`${ownSide}Team`]){target[`${ownSide}Team`]=name;changed=true}
        if(!included.has(String(target.game))){included.add(String(target.game));changed=true}
      }
    }
  }
  const list=[...included].map(key=>clones.get(key)).filter(Boolean).sort(gameSort);
  RESOLVED.journeyCache?.set(name,list);return list
}
function gamesForTeam(name){return routedGamesForTeam(name)}
function resultFor(g,name){const o=outcome(g);return o?(o.winner===name?'win':'loss'):null}
function otherTeam(g,name){return g.whiteTeam===name?g.darkTeam:g.darkTeam===name?g.whiteTeam:null}
function targetGame(destination){return validGameNumber(destination)?RESOLVED.map.get(normalizeGameNumber(destination)):null}
function sourceCandidates(raw){const ref=parseWL(raw);if(ref){const source=RESOLVED.map.get(ref.game);return source?[source.whiteTeam,source.darkTeam].filter(Boolean):[]}const matchup=parsePoolMatchup(raw);if(!matchup)return[];return[...new Set(sourceGamesForPoolMatchup(RESOLVED.games,matchup).flatMap(source=>[source.whiteTeam,source.darkTeam]).filter(Boolean))]}
function gameCandidates(g,name){if(!g)return[];const candidates=[];for(const side of ['white','dark']){const known=g[`${side}Team`],raw=g[`${side}Raw`];if(known){if(known!==name)candidates.push(known);continue}const ref=parseWL(raw),source=ref&&RESOLVED.map.get(ref.game);if(source&&(source.whiteTeam===name||source.darkTeam===name))continue;candidates.push(...sourceCandidates(raw).filter(x=>x!==name))}return[...new Set(candidates)]}
function destinationTargets(destination){
  const direct=targetGame(destination);if(direct)return[direct];
  const slot=parsePoolSlot(destination),pp=parsePoolPlacement(destination),gp=parseGroupPlacement(destination),value=String(destination||'').trim().replace(/-$/,'');
  return RESOLVED.games.filter(g=>[g.whiteRaw,g.darkRaw].some(raw=>{
    if(slot){const parsed=parsePoolSlot(raw);return parsed&&parsed.key===slot.key}
    if(pp){const parsed=parsePoolPlacement(raw);return parsed&&parsed.key===pp.key&&parsed.rank===pp.rank}
    if(gp){const parsed=parseGroupPlacement(raw);return parsed&&parsed.key===gp.key&&parsed.rank===gp.rank}
    return String(raw||'').trim().replace(/-$/,'')===value;
  })).sort(gameSort)
}
function pathSideMatches(raw,destination,sourceGame,routeKind){
  const ref=parseWL(raw);if(ref&&sourceGame&&String(ref.game)===String(sourceGame.game)&&(!routeKind||ref.kind===routeKind))return true;
  const matchup=parsePoolMatchup(raw);if(matchup&&sourceGame&&(!routeKind||matchup.kind===routeKind)&&poolMatchupMatchesGame(sourceGame,matchup))return true;
  const slot=parsePoolSlot(destination),rawSlot=parsePoolSlot(raw);if(slot&&rawSlot&&slot.key===rawSlot.key)return true;
  const pp=parsePoolPlacement(destination),rawPP=parsePoolPlacement(raw);if(pp&&rawPP&&pp.key===rawPP.key&&pp.rank===rawPP.rank)return true;
  const gp=parseGroupPlacement(destination),rawGP=parseGroupPlacement(raw);if(gp&&rawGP&&gp.key===rawGP.key&&gp.rank===rawGP.rank)return true;
  return false
}
function pathOpponentInfo(target,destination,sourceGame,routeKind,name){
  let pathSide=null;for(const side of ['white','dark'])if(pathSideMatches(target[`${side}Raw`],destination,sourceGame,routeKind)){pathSide=side;break}
  if(!pathSide){for(const side of ['white','dark'])if(target[`${side}Team`]===name){pathSide=side;break}}
  const opponentSide=pathSide==='white'?'dark':pathSide==='dark'?'white':null;
  if(!opponentSide)return{label:'Opponent TBD',candidates:[]};
  const known=target[`${opponentSide}Team`],raw=target[`${opponentSide}Raw`];
  const candidates=known?[known]:sourceCandidates(raw);
  return{label:known||slotLabel(raw)||'Opponent TBD',candidates:[...new Set(candidates.filter(x=>x&&x!==name))]}
}
function projectedOpponentPaths(name,upcoming,maxDepth=3){
  if(!upcoming)return[];const rows=[],seen=new Set();
  const add=(game,route,label,candidates)=>{const list=candidates.length?candidates:[null];for(const candidate of list){const key=[game.game,route,candidate||label].join('|');if(seen.has(key))continue;seen.add(key);rows.push({game,route,label,candidate})}}
  const immediateKnown=otherTeam(upcoming,name),immediateCandidates=immediateKnown?[immediateKnown]:gameCandidates(upcoming,name);
  let immediateLabel=immediateKnown||'Opponent TBD';if(!immediateKnown){for(const side of ['white','dark']){if(upcoming[`${side}Team`]===name){const other=side==='white'?'dark':'white';immediateLabel=slotLabel(upcoming[`${other}Raw`]);break}}}
  add(upcoming,'Next game',immediateLabel,immediateCandidates);
  const walk=(sourceGame,route,depth)=>{if(depth>=maxDepth||rows.length>=18)return;for(const [kind,destination] of [['W',sourceGame.winnerTo],['L',sourceGame.loserTo]]){if(!destination)continue;const condition=`${route} → ${kind==='W'?'win':'lose'} Game ${sourceGame.game}`;for(const target of destinationTargets(destination)){const info=pathOpponentInfo(target,destination,sourceGame,kind,name);add(target,condition,info.label,info.candidates);walk(target,condition,depth+1);if(rows.length>=18)return}}};
  walk(upcoming,'Path',0);return rows
}
function destinationDescription(value){if(validGameNumber(value)){const g=targetGame(value);return g?{title:`Game ${g.game}`,detail:`${friendlyDate(g.date)} · ${g.time} · ${g.location}`}:{title:`Game ${value}`,detail:'Schedule details unavailable'}}const slot=parsePoolSlot(value);if(slot)return{title:slotLabel(value),detail:'Pool games will appear automatically after this result is posted.'};return value&&!['RR','bracket'].includes(String(value).toLowerCase())?{title:slotLabel(value),detail:'The next scheduled game will appear when the bracket resolves.'}:null}


function mergeVerifiedSchedule(primaryGames,referenceGames=[]){
  const refsByGmid=new Map(),refsByGame=new Map();
  for(const ref of referenceGames||[]){if(ref?.gmid)refsByGmid.set(String(ref.gmid),ref);if(ref?.game!=null)refsByGame.set(String(ref.game),ref)}
  const merged=(primaryGames||[]).map(game=>{const reference=refsByGmid.get(String(game?.gmid||''))||refsByGame.get(String(game?.game??''));if(!reference)return{...game};const next={...game};for(const field of ['winnerTo','loserTo','whiteRaw','darkRaw','date','time','type','stageDetail','location','gmid']){if(String(next[field]??'').trim()===''&&String(reference[field]??'').trim()!=='')next[field]=field==='winnerTo'||field==='loserTo'?normalizeDestination(reference[field]):reference[field]}return next});
  const byGame=new Map(merged.map(game=>[String(game.game),game]));
  for(const target of merged){for(const raw of [target.whiteRaw,target.darkRaw]){const ref=parseWL(raw);if(!ref)continue;const source=byGame.get(String(ref.game));if(!source)continue;const field=ref.kind==='W'?'winnerTo':'loserTo';if(String(source[field]??'').trim()==='')source[field]=String(target.game)}}
  return merged
}
function datasetWithVerifiedRoutes(config,games,teams,referenceDataset){const merged=mergeVerifiedSchedule(games,referenceDataset?.games||[]);return{age:config.age,division:config.division,teams:Array.isArray(teams)&&teams.length?teams:teamsFromGames(merged),games:merged}}


const TRACK_LABELS={pt:'Platinum',au:'Gold',ag:'Silver',bz:'Bronze',cu:'Copper',ni:'Nickel'};
function alphaGroupLabel(index){let value=Number(index)+1,label='';while(value>0){value-=1;label=String.fromCharCode(65+(value%26))+label;value=Math.floor(value/26)}return label}
function directSeededTeamInfo(raw){const info=seedInfo(raw);return info&&info.team&&Number.isFinite(info.seed)&&info.seed<999?info:null}
function initialGroupBuckets(){
  const explicit=new Map(),routed=new Map();
  for(const game of RESOLVED.games||[]){
    if(!/group/i.test(String(game.type||''))||routeTrackForGame(game))continue;
    const white=directSeededTeamInfo(game.whiteRaw),dark=directSeededTeamInfo(game.darkRaw);
    for(const info of [white,dark])if(info?.group){if(!explicit.has(info.group))explicit.set(info.group,{label:info.group,members:new Map(),games:[]});explicit.get(info.group).members.set(info.team,info.seed);explicit.get(info.group).games.push(game)}
    if(!white||!dark||white.group||dark.group)continue;
    const winner=String(game.winnerTo||'').trim(),loser=String(game.loserTo||'').trim();
    if(!winner&&!loser)continue;
    const key=[winner,loser].sort().join('|');
    if(!routed.has(key))routed.set(key,{label:'',members:new Map(),games:[]});
    const bucket=routed.get(key);bucket.members.set(white.team,white.seed);bucket.members.set(dark.team,dark.seed);bucket.games.push(game);
  }
  const routedGroups=[...routed.values()].filter(bucket=>bucket.members.size>=3).sort((a,b)=>Math.min(...a.members.values())-Math.min(...b.members.values()));
  routedGroups.forEach((bucket,index)=>bucket.label=alphaGroupLabel(index));
  return[...explicit.values(),...routedGroups].map(bucket=>({label:bucket.label,members:[...bucket.members.entries()].sort((a,b)=>a[1]-b[1]||a[0].localeCompare(b[0])).map(([team])=>team),games:bucket.games}));
}
function initialGroupForTeam(name){return initialGroupBuckets().find(bucket=>bucket.members.includes(name))||null}
function routeGroupInfo(game,name){
  if(!game)return null;
  for(const side of ['white','dark']){
    const raw=game[`${side}Raw`],known=game[`${side}Team`]||assignedRouteTeam(raw,DATA?.teams||[]);
    if(known!==name)continue;
    const slot=parsePoolSlot(raw);if(slot)return{track:slot.track,group:slot.pool,seed:slot.seed};
    const placement=parsePoolPlacement(raw);if(placement)return{track:placement.track,group:placement.pool,seed:placement.rank};
  }
  return null;
}
function routeGroupRoster(track,group){
  const members=new Map();
  for(const game of RESOLVED.games||[]){
    for(const side of ['white','dark']){
      const raw=game[`${side}Raw`],slot=parsePoolSlot(raw);if(!slot||slot.track!==track||slot.pool!==group)continue;
      const member=game[`${side}Team`]||assignedRouteTeam(raw,DATA?.teams||[])||smartTeam(raw);if(member)members.set(member,Math.min(members.get(member)??999,slot.seed));
    }
  }
  return[...members.entries()].sort((a,b)=>a[1]-b[1]||a[0].localeCompare(b[0])).map(([team])=>team);
}
function roundOnlyLabel(game){
  const detail=String(game?.stageDetail||'').trim(),raw=String(game?.type||'').trim(),match=detail.match(/^([a-z]{2,3})[_-](.+)$/i);
  let round=(match?match[2]:raw||detail).replace(/_/g,' ').trim();
  round=round.replace(/\bsemi(?:finals?)?\b/ig,'Semifinal').replace(/\bqtr\b|\bquarter(?:finals?)?\b/ig,'Quarterfinal').replace(/\bplay[- ]?in\b/ig,'Play-in').replace(/^group$/i,'Group play').replace(/\bRR\b/g,'round robin');
  if(/^1st$/i.test(round))round='Championship game';else if(/^(\d+)(st|nd|rd|th)$/i.test(round))round=`${round} place game`;
  return round||raw||detail||'Tournament stage';
}
function stageContextForTeam(name,games,upcoming){
  const ordered=[...(games||[])].sort(gameSort),focus=upcoming||ordered[ordered.length-1]||null;
  let route=routeGroupInfo(focus,name),track=routeTrackForGame(focus)||route?.track||null;
  if(!route){for(let i=ordered.length-1;i>=0;i--){const candidate=routeGroupInfo(ordered[i],name);if(candidate&&(!track||candidate.track===track)){route=candidate;track=track||candidate.track;break}}}
  if(track){
    const division=trackLabel(track),group=route?.group||'',members=group?routeGroupRoster(track,group):[];
    const groupPhase=/group/i.test(String(focus?.type||''))||/[_-]group/i.test(String(focus?.stageDetail||''));
    return{stage:groupPhase&&group?`${division} · Group ${group}`:[division,roundOnlyLabel(focus)].filter(Boolean).join(' · '),groupTitle:group?`${division} Group ${group}`:division,members,kind:'subdivision',track,group};
  }
  const initial=initialGroupForTeam(name);
  if(initial)return{stage:`Group ${initial.label}`,groupTitle:`Group ${initial.label}`,members:initial.members,kind:'initial',track:null,group:initial.label};
  return{stage:statusText(games,upcoming),groupTitle:'',members:[],kind:'status',track:null,group:''};
}
function stageContextHtml(context,name){
  if(!context?.members?.length)return'';
  return`<div class="jo-stage-context"><div class="jo-stage-context-heading"><span>${context.kind==='initial'?'Opening group':'Subdivision group'}</span><strong>${esc(context.groupTitle)}</strong></div><div class="jo-stage-members">${context.members.map(member=>`<span class="jo-stage-member${member===name?' selected':''}">${teamLabelHtml(member,'',false)}</span>`).join('')}</div></div>`;
}

const TRACK_ORDER=['pt','au','ag','bz','cu','ni'];
function placementOrdinal(place){
  const value=Number(place);if(!Number.isFinite(value))return'';
  const mod100=value%100,suffix=mod100>=11&&mod100<=13?'th':value%10===1?'st':value%10===2?'nd':value%10===3?'rd':'th';return`${value}${suffix}`;
}
function exactPlacementSpec(game){
  for(const value of [game?.type,String(game?.stageDetail||'').replace(/^[a-z]{2,3}[_-]/i,'')]){
    const match=String(value||'').trim().match(/^(\d+)(?:st|nd|rd|th)(?:\s*[/&-]\s*(\d+)(?:st|nd|rd|th))?\s*(?:place(?:ment)?\s*(?:game)?)?$/i);
    if(match){const winnerPlace=Number(match[1]),loserPlace=match[2]?Number(match[2]):winnerPlace+1;return{winnerPlace,loserPlace}}
  }
  return null;
}
function roundRobinPlacementSpec(game){
  for(const value of [game?.type,String(game?.stageDetail||'').replace(/^[a-z]{2,3}[_-]/i,'')]){
    const text=String(value||'').trim(),match=text.match(/^(\d+)\s*[-–—]\s*(\d+)\s*(?:RR|round\s*robin|final\s*pool)$/i);
    if(match)return{start:Number(match[1]),end:Number(match[2])};
  }
  return null;
}
function placementTrackForTeam(name,games=[]){
  const ordered=[...(games||[])].sort(gameSort).reverse();
  for(const game of ordered){const track=routeTrackForGame(game)||routeGroupInfo(game,name)?.track;if(track)return track}
  return null;
}
function terminalPlacementForTeam(name,games=[]){
  const ordered=[...(games||[])].filter(isFinal).sort(gameSort).reverse();
  for(const game of ordered){
    const spec=exactPlacementSpec(game),result=spec&&resultFor(game,name);if(!spec||!result)continue;
    return{track:routeTrackForGame(game)||placementTrackForTeam(name,games),subdivisionPlace:result==='win'?spec.winnerPlace:spec.loserPlace,source:'placement-game',game};
  }
  const seen=new Set();
  for(const game of ordered){
    const spec=roundRobinPlacementSpec(game),track=routeTrackForGame(game)||placementTrackForTeam(name,games);if(!spec||!track)continue;
    const key=`${track}:${spec.start}-${spec.end}`;if(seen.has(key))continue;seen.add(key);
    const bucket=(RESOLVED.games||[]).filter(candidate=>{const other=roundRobinPlacementSpec(candidate);return other&&other.start===spec.start&&other.end===spec.end&&routeTrackForGame(candidate)===track});
    if(!bucket.length||!bucket.every(isFinal))continue;
    const teams=[...new Set(bucket.flatMap(candidate=>[candidate.whiteTeam,candidate.darkTeam]).filter(Boolean))];if(!teams.includes(name))continue;
    const ranked=rankTable(teams,bucket,RESOLVED.seedLookup||new Map()),index=ranked.indexOf(name);if(index<0)continue;
    return{track,subdivisionPlace:spec.start+index,source:'round-robin',game};
  }
  return null;
}
function subdivisionCapacity(track){
  let capacity=0;
  for(const game of RESOLVED.games||[]){if(routeTrackForGame(game)!==track)continue;const exact=exactPlacementSpec(game),roundRobin=roundRobinPlacementSpec(game);if(exact)capacity=Math.max(capacity,exact.winnerPlace,exact.loserPlace);if(roundRobin)capacity=Math.max(capacity,roundRobin.end)}
  if(capacity)return capacity;
  const members=new Set();
  for(const teamName of DATA.teams||[]){const teamGames=(RESOLVED.teamGames?.get(teamName)||[]).filter(game=>routeTrackForGame(game));const finalTrack=placementTrackForTeam(teamName,teamGames);if(finalTrack===track)members.add(teamName)}
  return members.size;
}
function finalPlacementForTeam(name,games=[],upcoming=null){
  if(!name||upcoming)return null;const placement=terminalPlacementForTeam(name,games);if(!placement)return null;
  const totalTeams=(DATA.teams||[]).length,track=placement.track,place=placement.subdivisionPlace;if(!Number.isFinite(place)||place<1)return null;
  let overallPlace=place;
  if(track){const trackIndex=TRACK_ORDER.indexOf(track);if(trackIndex<0)return{...placement,totalTeams,overallPlace:null,divisionLabel:trackLabel(track)};for(const earlier of TRACK_ORDER.slice(0,trackIndex))overallPlace+=subdivisionCapacity(earlier)}
  if(totalTeams&&overallPlace>totalTeams)overallPlace=null;
  return{...placement,totalTeams,overallPlace,divisionLabel:track?trackLabel(track):''};
}
function finalPlacementHtml(placement){
  if(!placement)return'';const subdivision=`${placementOrdinal(placement.subdivisionPlace)}${placement.divisionLabel?` in ${placement.divisionLabel}`:''}`;
  const overall=placement.overallPlace&&placement.totalTeams?`${placementOrdinal(placement.overallPlace)} of ${placement.totalTeams} teams overall`:placement.totalTeams?`${placement.totalTeams} teams in the division`:'';
  return`<div class="next-label">Final placement</div><div class="jo-final-placement"><strong>${esc(subdivision)}</strong>${overall?`<span>${esc(overall)}</span>`:''}</div>`;
}

const initialParams=new URLSearchParams(window.location.search);
let pendingTeam=initialParams.get('team')||'';
let pendingDivision=initialParams.get('division')||'';
let pendingAge=initialParams.get('age')||'';
let pendingJourneyFocus=initialParams.get('focus')==='journey'||window.location.hash==='#team-explorer';
function applyInitialSelection(){
  if(pendingDivision){const cfg=DATASETS.find(d=>d.id===pendingDivision);if(cfg){age.value=cfg.age;populateDivisions(cfg.id)}}
  else if(pendingAge&&[...age.options].some(o=>o.value===pendingAge)){age.value=pendingAge;populateDivisions()}
}
function updateShareUrl(){
  const config=currentConfig();if(!config)return;
  const params=new URLSearchParams();params.set('division',config.id);if(team.value)params.set('team',team.value);
  history.replaceState(null,'',`${window.location.pathname}?${params.toString()}`);
}
async function copyShareLink(){
  updateShareUrl();const absolute=window.location.href;
  try{await navigator.clipboard.writeText(absolute);share.textContent='Copied link'}catch{window.prompt('Copy this link',absolute)}
  setTimeout(()=>share.textContent=team.value?'Share team link':'Share division link',1600)
}
function populateFullDay(){
  const fullDay=$('fullDay');if(!fullDay)return;
  const previous=fullDay.value;
  fullDay.innerHTML='<option value="">All days</option>'+[...new Set(DATA.games.map(g=>g.date))].sort((a,b)=>dateValue(a)-dateValue(b)).map(d=>`<option value="${esc(d)}">${esc(friendlyDate(d))}</option>`).join('');
  if([...fullDay.options].some(o=>o.value===previous))fullDay.value=previous;
}
function renderFullSchedule(){
  const fullSchedule=$('fullSchedule'),fullCount=$('fullCount'),fullSearch=$('fullSearch'),fullDay=$('fullDay');if(!fullSchedule)return;
  const q=String(fullSearch?.value||'').trim().toLowerCase(),selectedDay=fullDay?.value||'';
  let list=RESOLVED.games.filter(g=>display(g,'white')||display(g,'dark'));
  list=list.filter(g=>(!selectedDay||g.date===selectedDay)&&(!q||[display(g,'white'),display(g,'dark'),g.location,g.type,g.gmid,g.game].join(' ').toLowerCase().includes(q))).sort(gameSort);
  if(fullCount)fullCount.textContent=`${list.length} games shown`;
  fullSchedule.innerHTML=list.length?list.map(g=>`<article class="game glass ${isFinal(g)?'completed':''}"><div class="top"><span>Game ${g.game}${isFinal(g)?' · FINAL':''}</span><span>${esc(friendlyDate(g.date))} · ${esc(g.time)}</span></div><div class="match">${matchupHtml(g)}</div><div class="journey-meta">${venueLinksHtml(g.location)}<span> · ${esc(friendlyStage(g))} · ${esc(g.gmid)}</span></div></article>`).join(''):'<div class="empty glass">No games match the current full-schedule filters.</div>';
}

function setEmptyState(){const empty=$('emptyState');if(empty)empty.classList.toggle('hidden',!!team.value)}
function populateAges(){const selected=pendingAge||localStorage.getItem('joBoysAgeV1')||'14U',ages=[...new Set(DATASETS.map(d=>d.age))];age.innerHTML=ages.map(x=>`<option value="${esc(x)}">${esc(x)}</option>`).join('');age.value=ages.includes(selected)?selected:ages[0];populateDivisions();applyInitialSelection()}
function populateDivisions(preferred){const choices=DATASETS.filter(d=>d.age===age.value),saved=preferred||localStorage.getItem(`joBoysDivisionV1:${age.value}`);division.innerHTML=choices.map(d=>`<option value="${esc(d.id)}">${esc(d.division)}</option>`).join('');division.value=choices.some(d=>d.id===saved)?saved:choices[0]?.id||''}
function normalizedTeamKey(value){return String(value||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim()}
function populateTeamAndDay(){const config=currentConfig(),saved=config?localStorage.getItem(`joBoysSelectedTeam:${config.id}`)||'':'';team.innerHTML='<option value="">Choose your team</option>'+DATA.teams.map(t=>`<option value="${esc(t)}">${esc(teamOptionLabel(t))}</option>`).join('');const target=pendingTeam||saved,matched=DATA.teams.includes(target)?target:DATA.teams.find(candidate=>normalizedTeamKey(candidate)===normalizedTeamKey(target));if(matched)team.value=matched;pendingTeam='';const previous=day.value;day.innerHTML='<option value="">All days</option>'+[...new Set(DATA.games.map(g=>g.date))].sort((a,b)=>dateValue(a)-dateValue(b)).map(d=>`<option value="${esc(d)}">${esc(friendlyDate(d))}</option>`).join('');if([...day.options].some(o=>o.value===previous))day.value=previous;populateFullDay();}

function renderPaths(upcoming){const win=destinationDescription(upcoming.winnerTo),loss=destinationDescription(upcoming.loserTo);$('pathSection').classList.toggle('hidden',!win&&!loss);paths.innerHTML=[['win','If they win',win],['loss','If they lose',loss]].filter(x=>x[2]).map(([cls,label,d])=>`<article class="path-card ${cls} glass"><h3>${label}</h3><div class="path-destination">${esc(d.title)}</div><div class="path-detail">${esc(d.detail)}</div></article>`).join('')}
function statusText(games,upcoming){if(!games.length)return'No games found';if(!games.some(isFinal))return'Tournament not started';if(upcoming&&/5th/i.test(upcoming.type))return'Playing for 5th/6th';if(upcoming&&/3rd/i.test(upcoming.type))return'Playing for 3rd/4th';if(upcoming&&/1st|champ/i.test(upcoming.type))return'Playing for the championship';if(upcoming)return'Still alive';return'Tournament complete'}
function renderTeam(){
  const name=team.value,config=currentConfig();if(!name){$('teamView').classList.add('hidden');setEmptyState();updateShareUrl();return}
  $('teamView').classList.remove('hidden');setEmptyState();updateShareUrl();if(config)localStorage.setItem(`joBoysSelectedTeam:${config.id}`,name);
  const games=gamesForTeam(name),completed=games.filter(isFinal),upcoming=games.find(g=>!isFinal(g));
  const wins=completed.filter(g=>resultFor(g,name)==='win').length,losses=completed.length-wins,seed=seedForTeam(name),stage=stageContextForTeam(name,games,upcoming),finalPlacement=finalPlacementForTeam(name,games,upcoming);
  summary.innerHTML=`<div class="eyebrow">Selected team</div><div class="jo-summary-title">${teamLogoHtml(name,'selected')}<h2>${esc(name)}</h2>${seed?`<span class="jo-seed-summary">JO seed #${seed}</span>`:''}</div><div class="stats"><div class="stat"><small>Record</small>${completed.length?`${wins}-${losses}`:'—'}</div><div class="stat"><small>Games played</small>${completed.length}</div><div class="stat stage-stat"><small>Stage</small>${esc(stage.stage)}</div></div>${stageContextHtml(stage,name)}`;
  if(upcoming){const opp=otherTeam(upcoming,name),candidates=gameCandidates(upcoming,name);next.innerHTML=`<div class="next-label">Next game</div>${namedMatchupHtml(name,opp,candidates,'light')}<div>${esc(friendlyDate(upcoming.date))} · ${esc(upcoming.time)}</div><div class="journey-meta">${venueLinksHtml(upcoming.location)}<span> · Game ${upcoming.game} · ${esc(friendlyStage(upcoming))}</span></div>`;renderPaths(upcoming)}else{next.innerHTML=finalPlacement?finalPlacementHtml(finalPlacement):'<div class="next-label">Tournament status</div><div class="next-match">No upcoming game</div>';renderPaths({winnerTo:'',loserTo:''})}
  const grouped={};games.forEach(g=>(grouped[g.date]??=[]).push(g));journey.innerHTML=games.length?'<div class="journey">'+Object.entries(grouped).map(([date,list])=>`<section class="day"><h3>${esc(friendlyDate(date))}</h3>${list.map(g=>{const r=resultFor(g,name)||'upcoming';return`<article class="journey-card glass ${r}"><div class="journey-time">Game ${g.game}<br>${esc(g.time)}</div><div><div class="journey-score">${matchupHtml(g)}</div><div class="journey-meta">${venueLinksHtml(g.location)}<span> · ${esc(friendlyStage(g))}</span></div></div><span class="pill ${r}">${r==='win'?'Win':r==='loss'?'Loss':'Upcoming'}</span></article>`}).join('')}</section>`).join('')+'</div>':'<div class="empty glass">No resolved games are currently available for this team.</div>';renderRelevant();renderPotential(name,upcoming)
}

function relevantIds(name,upcoming){const ids=new Set(gamesForTeam(name).map(g=>g.game));if(!upcoming)return ids;for(const raw of [upcoming.whiteRaw,upcoming.darkRaw]){const ref=parseWL(raw);if(ref)ids.add(ref.game)}for(const dest of [upcoming.winnerTo,upcoming.loserTo]){const target=targetGame(dest);if(!target)continue;ids.add(target.game);for(const raw of [target.whiteRaw,target.darkRaw]){const ref=parseWL(raw);if(ref)ids.add(ref.game)}}return ids}
function renderRelevant(){const name=team.value,q=String(search.value||'').trim().toLowerCase(),selectedDay=day.value,games=gamesForTeam(name),upcoming=games.find(g=>!isFinal(g)),ids=relevantIds(name,upcoming);let list=RESOLVED.games.filter(g=>g.whiteTeam||g.darkTeam);if(!q)list=list.filter(g=>ids.has(g.game));list=list.filter(g=>(!selectedDay||g.date===selectedDay)&&(!q||[display(g,'white'),display(g,'dark'),g.location,g.type,g.gmid,g.game].join(' ').toLowerCase().includes(q))).sort(gameSort);schedule.innerHTML=list.length?list.map(g=>`<article class="game glass ${isFinal(g)?'completed':''}"><div class="top"><span>Game ${g.game}${isFinal(g)?' · FINAL':''}</span><span>${esc(friendlyDate(g.date))} · ${esc(g.time)}</span></div><div class="match">${matchupHtml(g)}</div><div class="journey-meta">${venueLinksHtml(g.location)}<span> · ${esc(friendlyStage(g))}</span></div></article>`).join(''):'<div class="empty glass">No games match the current filters.</div>'}

function renderPotential(name,upcoming){const paths=projectedOpponentPaths(name,upcoming);potential.innerHTML=paths.length?paths.slice(0,12).map(item=>{const meta=`${item.route} · Game ${item.game.game} · ${friendlyDate(item.game.date)} ${item.game.time}`;return item.candidate&&DATA.teams.includes(item.candidate)?`<button data-team="${esc(item.candidate)}"><div class="jo-potential-team">${teamLabelHtml(item.candidate,'',false)}</div><div class="journey-meta">${esc(meta)}</div></button>`:`<div class="jo-potential-placeholder"><div class="jo-potential-team">${esc(item.label)}</div><div class="journey-meta">${esc(meta)}</div></div>`}).join(''):'<div class="empty glass">No additional future opponents are currently identifiable.</div>';potential.querySelectorAll('[data-team]').forEach(button=>button.addEventListener('click',()=>{team.value=button.dataset.team;renderTeam();window.scrollTo({top:0,behavior:'smooth'})}))}

function rebuild(){RESOLVED=resolveTournament();populateTeamAndDay();renderFullSchedule();const config=currentConfig();setText('metricTeamCount',DATA.teams.length||'—');if(config){setText('activeDivisionTitle',`${config.age} ${config.division}`);setText('activeDivisionMeta',`${DATA.teams.length} teams · ${DATA.games.length} published games`);}if(team.value){renderTeam();if(pendingJourneyFocus){pendingJourneyFocus=false;setTimeout(()=>$('team-explorer')?.scrollIntoView({behavior:'smooth',block:'start'}),80)}}else{$('teamView').classList.add('hidden');setEmptyState();updateShareUrl();}}
function readCache(config){try{const raw=localStorage.getItem(`${CACHE_PREFIX}${config.id}`);if(!raw)return null;const cached=JSON.parse(raw);return cached&&Array.isArray(cached.games)?cached:null}catch{return null}}
function writeCache(config,data){try{localStorage.setItem(`${CACHE_PREFIX}${config.id}`,JSON.stringify({...data,cachedAt:new Date().toISOString()}))}catch{}}
function sourceTimestamp(value){if(!value)return'Not yet verified';const d=new Date(value);return Number.isNaN(d.getTime())?String(value):d.toLocaleString([],{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'})}
function setText(id,value){const node=$(id);if(node)node.textContent=String(value)}
function updateOverviewMetrics(config,games,updatedAt,mode=''){
  const list=games||[],completed=list.filter(isFinal).length,scheduled=Math.max(0,list.length-completed),teams=teamsFromGames(list).length;
  setText('metricDivisionCount',DATASETS.length);setText('metricTeamCount',teams||'—');setText('metricScheduledCount',scheduled);setText('metricCompletedCount',completed);
  setText('metricUpdatedAt',sourceTimestamp(updatedAt));setText('liveScheduledCount',scheduled);setText('liveCompletedCount',completed);setText('liveUpdatedAt',sourceTimestamp(updatedAt));
  if(config){setText('activeDivisionTitle',`${config.age} ${config.division}`);setText('activeDivisionMeta',`${teams||0} teams · ${list.length} published games${mode?` · ${mode}`:''}`);}
}
function renderSourceMeta(config,mode,games,updatedAt,detail='',sourceLabel='Official Google Sheet'){const root=$('sourceMeta');const completed=(games||[]).filter(isFinal).length,scheduled=Math.max(0,(games||[]).length-completed);updateOverviewMetrics(config,games,updatedAt,mode);if(!root)return;root.innerHTML=`<div><span>Source</span><strong>${esc(sourceLabel)}</strong></div><div><span>Last successful update</span><strong>${esc(sourceTimestamp(updatedAt))}</strong></div><div><span>Schedule</span><strong>${scheduled} scheduled · ${completed} completed</strong></div><div><span>Mode</span><strong>${esc(mode)}</strong></div>${detail?`<p>${esc(detail)}</p>`:''}`;}
function clearLiveRetry(){if(retryTimer){clearTimeout(retryTimer);retryTimer=null}}
function markLiveSuccess(config){liveFailureCounts.set(config.id,0);clearLiveRetry()}
function markLiveFailure(config){
  const failures=(liveFailureCounts.get(config.id)||0)+1;liveFailureCounts.set(config.id,failures);
  const delay=LIVE_RETRY_DELAYS_MS[Math.min(failures-1,LIVE_RETRY_DELAYS_MS.length-1)];
  clearLiveRetry();
  if(!document.hidden)retryTimer=setTimeout(()=>{retryTimer=null;if(currentConfig()?.id===config.id)loadCurrent(false)},delay);
  return delay;
}
function loadCurrent(manual=false){
  const config=currentConfig();if(!config)return Promise.resolve();
  const existing=activeLoads.get(config.id);if(existing)return existing;
  const task=loadCurrentInternal(config,manual).finally(()=>{if(activeLoads.get(config.id)===task)activeLoads.delete(config.id)});
  activeLoads.set(config.id,task);return task;
}
async function loadCurrentInternal(config,manual=false){
  lastLoadAttemptAt=Date.now();
  const version=++loadVersion,status=$('statusText'),dot=$('liveDot'),button=$('refresh');
  const cached=readCache(config),embedded=embeddedFallback(config);
  const immediate=cached?datasetWithVerifiedRoutes(config,cached.games,cached.teams,embedded):embedded;
  button.disabled=true;
  if(immediate){
    DATA=immediate;
    dot.classList.add('fallback');
    status.textContent=`Verified ${config.age} ${config.division} schedule loaded · checking WPI live relay…`;
    renderSourceMeta(config,cached?'Schedule ready · checking live relay':'Schedule ready · checking live relay',immediate.games,cached?.cachedAt||config.snapshotUpdatedAt,'A verified schedule is available immediately while WPI checks its server-side relay and the official Google Sheet.');
    rebuild();team.disabled=false;
  }else{
    team.disabled=true;
    status.textContent=manual?`Refreshing ${config.division}…`:`Loading ${config.age} ${config.division}…`;
    renderSourceMeta(config,'Checking WPI live relay',[],null);
  }
  const relayPromise=fetchRelayDataset(config).then(loaded=>({loaded}),error=>({error}));
  const livePromise=fetchDataset(config).then(loaded=>({loaded}),error=>({error}));
  let relayApplied=false,relayFresh=false;
  try{
    const relayResult=await relayPromise;if(relayResult.error)throw relayResult.error;
    const loaded=relayResult.loaded;if(version!==loadVersion)return;
    const relayData=datasetWithVerifiedRoutes(config,loaded.games,loaded.teams,embedded);
    const refreshedAt=loaded.updatedAt||loaded.checkedAt||new Date().toISOString();
    if(datasetIsOlder(relayData.games,DATA.games)){
      dot.classList.add('fallback');
      status.textContent=`Kept newer saved update · WPI relay is still catching up`;
      renderSourceMeta(config,'Newer browser update preserved',DATA.games,cached?.cachedAt||config.snapshotUpdatedAt,'The WPI relay returned fewer completed results, so this browser kept the newer schedule instead of moving backward.');
    }else{
      relayApplied=true;relayFresh=!loaded.isFallback;
      if(relayFresh)markLiveSuccess(config);
      DATA=relayData;
      writeCache(config,DATA);
      if(relayFresh){
        dot.classList.remove('fallback');
        status.textContent=`Live through WPI relay · ${config.age} ${config.division} · ${DATA.games.length} games · refreshed ${new Date(refreshedAt).toLocaleTimeString([],{hour:'numeric',minute:'2-digit'})}`;
        renderSourceMeta(config,'WPI live relay',DATA.games,refreshedAt,'WPI fetched and validated the official Google Sheet from its server-side relay, so this browser does not depend on a direct Google connection.','WPI live relay');
      }else{
        dot.classList.add('fallback');
        status.textContent=`Using WPI relay bank · ${config.age} ${config.division} · Google refresh pending`;
        renderSourceMeta(config,'Last-known-good WPI relay',DATA.games,refreshedAt,'The relay preserved its last validated schedule because its latest Google check was unsuccessful.','WPI live relay');
      }
      rebuild();team.disabled=false;
    }
  }catch(relayError){
    if(version!==loadVersion)return;
  }

  try{
    const liveResult=await livePromise;if(liveResult.error)throw liveResult.error;
    const loaded=liveResult.loaded;if(version!==loadVersion)return;
    const liveData=datasetWithVerifiedRoutes(config,loaded.games,loaded.teams,embedded);
    const refreshedAt=loaded.updatedAt||new Date().toISOString();
    if(datasetIsOlder(liveData.games,DATA.games)){
      if(!relayApplied){
        dot.classList.add('fallback');
        status.textContent=`Kept newer saved update · Google returned an older result set`;
        renderSourceMeta(config,'Newer browser update preserved',DATA.games,cached?.cachedAt||config.snapshotUpdatedAt,'The direct Google response contained fewer completed results, so WPI kept the newer schedule already on this device.');
      }
      return;
    }
    markLiveSuccess(config);
    DATA=liveData;
    writeCache(config,DATA);
    dot.classList.remove('fallback');
    status.textContent=`Live from Google Sheets · ${config.age} ${config.division} · ${DATA.games.length} games · ${loaded.method||'live'} · refreshed ${new Date(refreshedAt).toLocaleTimeString([],{hour:'numeric',minute:'2-digit'})}`;
    renderSourceMeta(config,'Live browser refresh',DATA.games,refreshedAt,'The browser reached Google directly. Live results remain merged with verified bracket-routing metadata.');
  }catch(error){
    if(version!==loadVersion)return;
    if(relayApplied&&relayFresh)return;
    const retryDelay=markLiveFailure(config);
    const retryNote=` WPI will retry live updates in about ${Math.round(retryDelay/1000)} seconds.`;
    if(relayApplied){
      dot.classList.add('fallback');
      status.textContent=`Using last-known-good WPI relay · direct Google connection unavailable`;
      renderSourceMeta(config,'Last-known-good WPI relay',DATA.games,null,'WPI preserved the relay schedule while both the relay and this browser wait for Google to recover.'+retryNote,'WPI live relay');
    }else{
      const fallbackCache=readCache(config);
      if(fallbackCache){
        DATA=datasetWithVerifiedRoutes(config,fallbackCache.games,fallbackCache.teams,embedded);
        dot.classList.add('fallback');
        status.textContent=`Using last successful ${config.age} ${config.division} update · live sources unavailable`;
        renderSourceMeta(config,'Last verified browser cache',DATA.games,fallbackCache.cachedAt,'The relay and live sheet could not be read. WPI preserved the last successful browser schedule.'+retryNote);
      }else if(embedded){
        DATA=embedded;
        dot.classList.add('fallback');
        status.textContent=`Using verified ${config.age} ${config.division} schedule · live sources unavailable`;
        renderSourceMeta(config,'Embedded verified schedule',DATA.games,config.snapshotUpdatedAt,'The schedule is built directly into this release, so it remains available during an upstream outage.'+retryNote);
      }else{
        DATA={age:config.age,division:config.division,teams:[],games:[]};
        dot.classList.add('fallback');
        status.textContent=`Could not load ${config.age} ${config.division} (${error.message})`;
        renderSourceMeta(config,'Unavailable',[],null,'No verified schedule is currently available in this browser.'+retryNote);
      }
    }
  }finally{
    if(version===loadVersion){rebuild();button.disabled=false;team.disabled=false}
  }
}

function selectDataset(){const config=currentConfig();if(!config)return;clearLiveRetry();activeLoads.clear();updateSheetLink();localStorage.setItem('joBoysAgeV1',config.age);localStorage.setItem(`joBoysDivisionV1:${config.age}`,config.id);search.value='';day.value='';loadCurrent(false)}
age.addEventListener('change',()=>{localStorage.setItem('joBoysAgeV1',age.value);populateDivisions();selectDataset()});division.addEventListener('change',selectDataset);team.addEventListener('change',renderTeam);document.addEventListener('click',event=>{const trigger=event.target.closest?.('[data-team-jump]');if(!trigger)return;event.preventDefault();const selected=trigger.dataset.teamJump;if(!selected||!DATA.teams.includes(selected))return;team.value=selected;renderTeam();$('team-explorer')?.scrollIntoView({behavior:'smooth',block:'start'});});search.addEventListener('input',renderRelevant);day.addEventListener('change',renderRelevant);$('journeyTab').addEventListener('click',()=>{$('journeyTab').classList.add('active');$('relevantTab').classList.remove('active');journey.classList.remove('hidden');$('relevant').classList.add('hidden')});$('relevantTab').addEventListener('click',()=>{$('relevantTab').classList.add('active');$('journeyTab').classList.remove('active');journey.classList.add('hidden');$('relevant').classList.remove('hidden')});$('refresh').addEventListener('click',()=>loadCurrent(true));
$('share')?.addEventListener('click',copyShareLink);
$('fullSearch')?.addEventListener('input',renderFullSchedule);
$('fullDay')?.addEventListener('change',renderFullSchedule);
function refreshWhenActive(){
  if(document.hidden)return;
  if(Date.now()-lastLoadAttemptAt<ACTIVE_REFRESH_MIN_MS)return;
  loadCurrent(false);
}
window.CPI_JO_APP_READY=true;
window.CPI_JO_REFRESH_INTERVAL_MS=REFRESH_MS;
populateAges();
selectDataset();
refreshTimer=setInterval(()=>loadCurrent(false),REFRESH_MS);
window.addEventListener('focus',refreshWhenActive);
window.addEventListener('online',refreshWhenActive);
window.addEventListener('pageshow',event=>{if(event.persisted){lastLoadAttemptAt=0;refreshWhenActive()}});
document.addEventListener('visibilitychange',()=>{if(!document.hidden)refreshWhenActive()});

