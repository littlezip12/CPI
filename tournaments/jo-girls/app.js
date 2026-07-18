
const SHEET_ID='1TyGB8m-dH1Q56v8Lpwdvw-S7kjxgP8MWsirsAeCYVNw';
const APP_VERSION='7.50.6';
const DATASETS=[{"id":"10u-girls-championship","age":"10U","division":"Girls Championship (D1)","gid":"1690842489","sheetName":"10U_F_Champ-18 teams","gidAliases":["1690842489"]},{"id":"10u-coed-championship","age":"10U","division":"Coed Championship (D1)","gid":"995024268","sheetName":"10U_Coed_Champ_36","gidAliases":["995024268","2041957360"]},{"id":"10u-girls-classic","age":"10U","division":"Girls Classic (D2)","gid":"1824277279","sheetName":"10U_Coed_Classic 22 from 23","gidAliases":["1824277279","597397535"]},{"id":"12u-coed-championship","age":"12U","division":"Coed Championship (D1)","gid":"1233368070","sheetName":"12U_Coed_Champ-45","gidAliases":["1233368070","2012252190"]},{"id":"12u-girls-championship","age":"12U","division":"Girls Championship (D1)","gid":"1025107975","sheetName":"12U_F_Champ-52","gidAliases":["1025107975","1128927098"]},{"id":"14u-girls-championship","age":"14U","division":"Girls Championship (D1)","gid":"490739644","sheetName":"14U_F_Champ","gidAliases":["490739644","1268677491"]},{"id":"14u-girls-classic","age":"14U","division":"Girls Classic (D2)","gid":"1034305520","sheetName":"14U_F_Classic-39 from 40","gidAliases":["1034305520","252316141"]},{"id":"16u-girls-championship","age":"16U","division":"Girls Championship (D1)","gid":"1614332560","sheetName":"16U_F_Champ","gidAliases":["1614332560","61950596"]},{"id":"16u-girls-classic","age":"16U","division":"Girls Classic (D2)","gid":"1031667515","sheetName":"16U_F_Classic-45","gidAliases":["1031667515","901188675"]},{"id":"18u-girls-championship","age":"18U","division":"Girls Championship (D1)","gid":"69636405","sheetName":"18U_F_Champ","gidAliases":["69636405","934738630"]},{"id":"18u-girls-classic","age":"18U","division":"Girls Classic (D2)","gid":"1267400335","sheetName":"18U_F_Classic-44","gidAliases":["1267400335","265773689"]}];
const EMBEDDED_FALLBACKS={'14u-girls-championship':{"age":"14U","division":"Championship","teams":["680 Red","908","American River","Arroyo Grande","Big Valley","Brooklyn Hustle","CC United","CDM","CHAWP White","Central Coast","Chicago Park","Clovis A","Commerce","Davis","Diablo Alliance A","Elite","Greenwich","Honolulu A","Innia Arden","Kearns","LB Shore","LOWPO","La Jolla United","Laguna Beach","Lamorinda A","Lamorinda B","Mavericks","Newport Beach Blue","Norco","Northwest","Patriot Navy","Punahou","Rogue 619","SD Dons","SD Shores Black","SD Shores Gold","SHAQ","San Clemente Black","San Clemente Red","Santa Barbara WPC A","Santa Cruz","South Coast Red","Southside","Stanford A","Stanford B","Temple City","Texas Thunder","Topaz Tsunami"],"games":[{"date":"18-Jul","time":"7:00 AM","type":"Group","location":"UC IRVINE 1","game":1,"whiteRaw":"3-908","whiteScore":"","darkRaw":"46-ELITE","darkScore":"","winnerTo":"25","loserTo":"29","gmid":"14G-001"},{"date":"18-Jul","time":"7:50 AM","type":"Group","location":"UC IRVINE 1","game":5,"whiteRaw":"22-STANFORD B","whiteScore":"","darkRaw":"27-ARROYO GRANDE","darkScore":"","winnerTo":"25","loserTo":"29","gmid":"14G-005"},{"date":"18-Jul","time":"8:40 AM","type":"Group","location":"UC IRVINE 1","game":9,"whiteRaw":"1-NEWPORT BEACH BLUE","whiteScore":"","darkRaw":"48-TOPAZ TSUNAMI","darkScore":"","winnerTo":"33","loserTo":"37","gmid":"14G-009"},{"date":"18-Jul","time":"9:30 AM","type":"Group","location":"UC IRVINE 1","game":13,"whiteRaw":"24-LAMORINDA B","whiteScore":"","darkRaw":"25-SAN CLEMENTE BLACK","darkScore":"","winnerTo":"33","loserTo":"37","gmid":"14G-013"},{"date":"18-Jul","time":"10:20 AM","type":"Group","location":"UC IRVINE 1","game":17,"whiteRaw":"2-SAN CLEMENTE RED","whiteScore":"","darkRaw":"47-NORTHWEST","darkScore":"","winnerTo":"41","loserTo":"45","gmid":"14G-017"},{"date":"18-Jul","time":"11:10 AM","type":"Group","location":"UC IRVINE 1","game":21,"whiteRaw":"23-INNIA ARDEN","whiteScore":"","darkRaw":"26-SHAQ","darkScore":"","winnerTo":"41","loserTo":"45","gmid":"14G-021"},{"date":"18-Jul","time":"12:00 PM","type":"Group","location":"UC IRVINE 1","game":25,"whiteRaw":"W1","whiteScore":"","darkRaw":"W5","darkScore":"","winnerTo":"pt_O1","loserTo":"50","gmid":"14G-025"},{"date":"18-Jul","time":"12:50 PM","type":"Group","location":"UC IRVINE 1","game":29,"whiteRaw":"L1","whiteScore":"","darkRaw":"L5","darkScore":"","winnerTo":"49","loserTo":"au_S3","gmid":"14G-029"},{"date":"18-Jul","time":"1:40 PM","type":"Group","location":"UC IRVINE 1","game":33,"whiteRaw":"W9","whiteScore":"","darkRaw":"W13","darkScore":"","winnerTo":"pt_M1","loserTo":"57","gmid":"14G-033"},{"date":"18-Jul","time":"2:30 PM","type":"Group","location":"UC IRVINE 1","game":37,"whiteRaw":"L9","whiteScore":"","darkRaw":"L13","darkScore":"","winnerTo":"53","loserTo":"au_U3","gmid":"14G-037"},{"date":"18-Jul","time":"3:20 PM","type":"Group","location":"UC IRVINE 1","game":41,"whiteRaw":"W17","whiteScore":"","darkRaw":"W21","darkScore":"","winnerTo":"pt_N1","loserTo":"53","gmid":"14G-041"},{"date":"18-Jul","time":"4:10 PM","type":"Group","location":"UC IRVINE 1","game":45,"whiteRaw":"L17","whiteScore":"","darkRaw":"L21","darkScore":"","winnerTo":"57","loserTo":"au_T3","gmid":"14G-045"},{"date":"18-Jul","time":"5:50 PM","type":"2-3 cross","location":"UC IRVINE 1","game":49,"whiteRaw":"L26","whiteScore":"","darkRaw":"W29","darkScore":"","winnerTo":"pt_R3","loserTo":"au_O1","gmid":"14G-049"},{"date":"18-Jul","time":"6:40 PM","type":"2-3 cross","location":"UC IRVINE 1","game":53,"whiteRaw":"L41","whiteScore":"","darkRaw":"W37","darkScore":"","winnerTo":"pt_T3","loserTo":"au_M1","gmid":"14G-053"},{"date":"18-Jul","time":"7:30 PM","type":"2-3 cross","location":"UC IRVINE 1","game":57,"whiteRaw":"L33","whiteScore":"","darkRaw":"W45","darkScore":"","winnerTo":"pt_U3","loserTo":"au_N1","gmid":"14G-057"},{"date":"18-Jul","time":"7:00 AM","type":"Group","location":"UC IRVINE 2","game":2,"whiteRaw":"4-DIABLO ALLIANCE A","whiteScore":"","darkRaw":"45-SOUTHSIDE","darkScore":"","winnerTo":"26","loserTo":"30","gmid":"14G-002"},{"date":"18-Jul","time":"7:50 AM","type":"Group","location":"UC IRVINE 2","game":6,"whiteRaw":"21-CDM","whiteScore":"","darkRaw":"28-CLOVIS A","darkScore":"","winnerTo":"26","loserTo":"30","gmid":"14G-006"},{"date":"18-Jul","time":"8:40 AM","type":"Group","location":"UC IRVINE 2","game":10,"whiteRaw":"5-LAMORINDA A","whiteScore":"","darkRaw":"44-CENTRAL COAST","darkScore":"","winnerTo":"34","loserTo":"38","gmid":"14G-010"},{"date":"18-Jul","time":"9:30 AM","type":"Group","location":"UC IRVINE 2","game":14,"whiteRaw":"20-SD DONS","whiteScore":"","darkRaw":"29-SD SHORES GOLD","darkScore":"","winnerTo":"34","loserTo":"38","gmid":"14G-014"},{"date":"18-Jul","time":"10:20 AM","type":"Group","location":"UC IRVINE 2","game":18,"whiteRaw":"6-STANFORD A","whiteScore":"","darkRaw":"43-CHICAGO PARK","darkScore":"","winnerTo":"42","loserTo":"46","gmid":"14G-018"},{"date":"18-Jul","time":"11:10 AM","type":"Group","location":"UC IRVINE 2","game":22,"whiteRaw":"19-LAGUNA BEACH","whiteScore":"","darkRaw":"30-MAVERICKS","darkScore":"","winnerTo":"42","loserTo":"46","gmid":"14G-022"},{"date":"18-Jul","time":"12:00 PM","type":"Group","location":"UC IRVINE 2","game":26,"whiteRaw":"W2","whiteScore":"","darkRaw":"W6","darkScore":"","winnerTo":"pt_P1","loserTo":"49","gmid":"14G-026"},{"date":"18-Jul","time":"12:50 PM","type":"Group","location":"UC IRVINE 2","game":30,"whiteRaw":"L2","whiteScore":"","darkRaw":"L6","darkScore":"","winnerTo":"50","loserTo":"au_R3","gmid":"14G-030"},{"date":"18-Jul","time":"1:40 PM","type":"Group","location":"UC IRVINE 2","game":34,"whiteRaw":"W10","whiteScore":"","darkRaw":"W14","darkScore":"","winnerTo":"pt_P2","loserTo":"58","gmid":"14G-034"},{"date":"18-Jul","time":"2:30 PM","type":"Group","location":"UC IRVINE 2","game":38,"whiteRaw":"L10","whiteScore":"","darkRaw":"L14","darkScore":"","winnerTo":"54","loserTo":"au_R2","gmid":"14G-038"},{"date":"18-Jul","time":"3:20 PM","type":"Group","location":"UC IRVINE 2","game":42,"whiteRaw":"W18","whiteScore":"","darkRaw":"W22","darkScore":"","winnerTo":"pt_O2","loserTo":"54","gmid":"14G-042"},{"date":"18-Jul","time":"4:10 PM","type":"Group","location":"UC IRVINE 2","game":46,"whiteRaw":"L18","whiteScore":"","darkRaw":"L22","darkScore":"","winnerTo":"58","loserTo":"au_S2","gmid":"14G-046"},{"date":"18-Jul","time":"5:50 PM","type":"2-3 cross","location":"UC IRVINE 2","game":50,"whiteRaw":"L25","whiteScore":"","darkRaw":"W30","darkScore":"","winnerTo":"pt_S3","loserTo":"au_P1","gmid":"14G-050"},{"date":"18-Jul","time":"6:40 PM","type":"2-3 cross","location":"UC IRVINE 2","game":54,"whiteRaw":"L42","whiteScore":"","darkRaw":"W38","darkScore":"","winnerTo":"pt_S2","loserTo":"au_P2","gmid":"14G-054"},{"date":"18-Jul","time":"7:30 PM","type":"2-3 cross","location":"UC IRVINE 2","game":58,"whiteRaw":"L34","whiteScore":"","darkRaw":"W46","darkScore":"","winnerTo":"pt_R2","loserTo":"au_O2","gmid":"14G-058"},{"date":"18-Jul","time":"7:00 AM","type":"Group","location":"SADDLEBACK COLLEGE 1","game":3,"whiteRaw":"9-SANTA BARBARA WPC A","whiteScore":"","darkRaw":"40-HONOLULU A","darkScore":"","winnerTo":"27","loserTo":"31","gmid":"14G-003"},{"date":"18-Jul","time":"7:50 AM","type":"Group","location":"SADDLEBACK COLLEGE 1","game":7,"whiteRaw":"16-DAVIS","whiteScore":"","darkRaw":"33-BROOKLYN HUSTLE","darkScore":"","winnerTo":"27","loserTo":"31","gmid":"14G-007"},{"date":"18-Jul","time":"8:40 AM","type":"Group","location":"SADDLEBACK COLLEGE 1","game":11,"whiteRaw":"7-SANTA CRUZ","whiteScore":"","darkRaw":"42-PUNAHOU","darkScore":"","winnerTo":"35","loserTo":"39","gmid":"14G-011"},{"date":"18-Jul","time":"9:30 AM","type":"Group","location":"SADDLEBACK COLLEGE 1","game":15,"whiteRaw":"18-SOUTH COAST RED","whiteScore":"","darkRaw":"31-BIG VALLEY","darkScore":"","winnerTo":"35","loserTo":"39","gmid":"14G-015"},{"date":"18-Jul","time":"10:20 AM","type":"Group","location":"SADDLEBACK COLLEGE 1","game":19,"whiteRaw":"8-GREENWICH","whiteScore":"","darkRaw":"41-NORCO","darkScore":"","winnerTo":"43","loserTo":"47","gmid":"14G-019"},{"date":"18-Jul","time":"11:10 AM","type":"Group","location":"SADDLEBACK COLLEGE 1","game":23,"whiteRaw":"17-CC UNITED","whiteScore":"","darkRaw":"32-TEMPLE CITY","darkScore":"","winnerTo":"43","loserTo":"47","gmid":"14G-023"},{"date":"18-Jul","time":"12:00 PM","type":"Group","location":"SADDLEBACK COLLEGE 1","game":27,"whiteRaw":"W3","whiteScore":"","darkRaw":"W7","darkScore":"","winnerTo":"pt_M3","loserTo":"52","gmid":"14G-027"},{"date":"18-Jul","time":"12:50 PM","type":"Group","location":"SADDLEBACK COLLEGE 1","game":31,"whiteRaw":"L3","whiteScore":"","darkRaw":"L7","darkScore":"","winnerTo":"51","loserTo":"au_U1","gmid":"14G-031"},{"date":"18-Jul","time":"1:40 PM","type":"Group","location":"SADDLEBACK COLLEGE 1","game":35,"whiteRaw":"W11","whiteScore":"","darkRaw":"W15","darkScore":"","winnerTo":"pt_N2","loserTo":"59","gmid":"14G-035"},{"date":"18-Jul","time":"2:30 PM","type":"Group","location":"SADDLEBACK COLLEGE 1","game":39,"whiteRaw":"L11","whiteScore":"","darkRaw":"L15","darkScore":"","winnerTo":"55","loserTo":"au_T2","gmid":"14G-039"},{"date":"18-Jul","time":"3:20 PM","type":"Group","location":"SADDLEBACK COLLEGE 1","game":43,"whiteRaw":"W19","whiteScore":"","darkRaw":"W23","darkScore":"","winnerTo":"pt_M2","loserTo":"55","gmid":"14G-043"},{"date":"18-Jul","time":"4:10 PM","type":"Group","location":"SADDLEBACK COLLEGE 1","game":47,"whiteRaw":"L19","whiteScore":"","darkRaw":"L23","darkScore":"","winnerTo":"59","loserTo":"au_U2","gmid":"14G-047"},{"date":"18-Jul","time":"5:50 PM","type":"2-3 cross","location":"SADDLEBACK COLLEGE 1","game":51,"whiteRaw":"L28","whiteScore":"","darkRaw":"W31","darkScore":"","winnerTo":"pt_T1","loserTo":"au_M3","gmid":"14G-051"},{"date":"18-Jul","time":"6:40 PM","type":"2-3 cross","location":"SADDLEBACK COLLEGE 1","game":55,"whiteRaw":"L43","whiteScore":"","darkRaw":"W39","darkScore":"","winnerTo":"pt_U2","loserTo":"au_N2","gmid":"14G-055"},{"date":"18-Jul","time":"7:30 PM","type":"2-3 cross","location":"SADDLEBACK COLLEGE 1","game":59,"whiteRaw":"L35","whiteScore":"","darkRaw":"W47","darkScore":"","winnerTo":"pt_T2","loserTo":"au_M2","gmid":"14G-059"},{"date":"18-Jul","time":"7:00 AM","type":"Group","location":"BUENA PARK HS","game":4,"whiteRaw":"10-680 RED","whiteScore":"","darkRaw":"39-TEXAS THUNDER","darkScore":"","winnerTo":"28","loserTo":"32","gmid":"14G-004"},{"date":"18-Jul","time":"7:50 AM","type":"Group","location":"BUENA PARK HS","game":8,"whiteRaw":"15-CHAWP WHITE","whiteScore":"","darkRaw":"34-KEARNS","darkScore":"","winnerTo":"28","loserTo":"32","gmid":"14G-008"},{"date":"18-Jul","time":"8:40 AM","type":"Group","location":"BUENA PARK HS","game":12,"whiteRaw":"11-LB SHORE","whiteScore":"","darkRaw":"38-AMERICAN RIVER","darkScore":"","winnerTo":"36","loserTo":"40","gmid":"14G-012"},{"date":"18-Jul","time":"9:30 AM","type":"Group","location":"BUENA PARK HS","game":16,"whiteRaw":"14-SD SHORES BLACK","whiteScore":"","darkRaw":"35-ROGUE 619","darkScore":"","winnerTo":"36","loserTo":"40","gmid":"14G-016"},{"date":"18-Jul","time":"10:20 AM","type":"Group","location":"BUENA PARK HS","game":20,"whiteRaw":"12-COMMERCE","whiteScore":"","darkRaw":"37-LA JOLLA UNITED","darkScore":"","winnerTo":"44","loserTo":"48","gmid":"14G-020"},{"date":"18-Jul","time":"11:10 AM","type":"Group","location":"BUENA PARK HS","game":24,"whiteRaw":"13-PATRIOT NAVY","whiteScore":"","darkRaw":"36-LOWPO","darkScore":"","winnerTo":"44","loserTo":"48","gmid":"14G-024"},{"date":"18-Jul","time":"12:00 PM","type":"Group","location":"BUENA PARK HS","game":28,"whiteRaw":"W4","whiteScore":"","darkRaw":"W8","darkScore":"","winnerTo":"pt_N3","loserTo":"51","gmid":"14G-028"},{"date":"18-Jul","time":"12:50 PM","type":"Group","location":"BUENA PARK HS","game":32,"whiteRaw":"L4","whiteScore":"","darkRaw":"L8","darkScore":"","winnerTo":"52","loserTo":"au_T1","gmid":"14G-032"},{"date":"18-Jul","time":"1:40 PM","type":"Group","location":"BUENA PARK HS","game":36,"whiteRaw":"W12","whiteScore":"","darkRaw":"W16","darkScore":"","winnerTo":"pt_O3","loserTo":"60","gmid":"14G-036"},{"date":"18-Jul","time":"2:30 PM","type":"Group","location":"BUENA PARK HS","game":40,"whiteRaw":"L12","whiteScore":"","darkRaw":"L16","darkScore":"","winnerTo":"56","loserTo":"au_S1","gmid":"14G-040"},{"date":"18-Jul","time":"3:20 PM","type":"Group","location":"BUENA PARK HS","game":44,"whiteRaw":"W20","whiteScore":"","darkRaw":"W24","darkScore":"","winnerTo":"pt_P3","loserTo":"56","gmid":"14G-044"},{"date":"18-Jul","time":"4:10 PM","type":"Group","location":"BUENA PARK HS","game":48,"whiteRaw":"L20","whiteScore":"","darkRaw":"L24","darkScore":"","winnerTo":"60","loserTo":"au_R1","gmid":"14G-048"},{"date":"18-Jul","time":"5:50 PM","type":"2-3 cross","location":"BUENA PARK HS","game":52,"whiteRaw":"L27","whiteScore":"","darkRaw":"W32","darkScore":"","winnerTo":"pt_U1","loserTo":"au_N3","gmid":"14G-052"},{"date":"18-Jul","time":"6:40 PM","type":"2-3 cross","location":"BUENA PARK HS","game":56,"whiteRaw":"L44","whiteScore":"","darkRaw":"W40","darkScore":"","winnerTo":"pt_R1","loserTo":"au_O3","gmid":"14G-056"},{"date":"18-Jul","time":"7:30 PM","type":"2-3 cross","location":"BUENA PARK HS","game":60,"whiteRaw":"L36","whiteScore":"","darkRaw":"W48","darkScore":"","winnerTo":"pt_S1","loserTo":"au_P3","gmid":"14G-060"},{"date":"19-Jul","time":"7:00 AM","type":"Group","location":"SADDLEBACK COLLEGE 1","game":61,"whiteRaw":"pt_M2","whiteScore":"","darkRaw":"pt_M3","darkScore":"","winnerTo":"","loserTo":"","gmid":"14G-061"},{"date":"19-Jul","time":"7:50 AM","type":"Group","location":"SADDLEBACK COLLEGE 1","game":65,"whiteRaw":"pt_N2","whiteScore":"","darkRaw":"pt_N3","darkScore":"","winnerTo":"","loserTo":"","gmid":"14G-065"},{"date":"19-Jul","time":"8:40 AM","type":"Group","location":"SADDLEBACK COLLEGE 1","game":69,"whiteRaw":"pt_S1","whiteScore":"","darkRaw":"pt_S2","darkScore":"","winnerTo":"","loserTo":"","gmid":"14G-069"},{"date":"19-Jul","time":"9:30 AM","type":"Group","location":"SADDLEBACK COLLEGE 1","game":73,"whiteRaw":"pt_R1","whiteScore":"","darkRaw":"pt_R2","darkScore":"","winnerTo":"","loserTo":"","gmid":"14G-073"},{"date":"19-Jul","time":"10:20 AM","type":"Group","location":"SADDLEBACK COLLEGE 1","game":77,"whiteRaw":"pt_M1","whiteScore":"","darkRaw":"pt_M3","darkScore":"","winnerTo":"","loserTo":"","gmid":"14G-077"},{"date":"19-Jul","time":"11:10 AM","type":"Group","location":"SADDLEBACK COLLEGE 1","game":81,"whiteRaw":"pt_N1","whiteScore":"","darkRaw":"pt_N3","darkScore":"","winnerTo":"","loserTo":"","gmid":"14G-081"},{"date":"19-Jul","time":"12:00 PM","type":"Group","location":"SADDLEBACK COLLEGE 1","game":85,"whiteRaw":"pt_S1","whiteScore":"","darkRaw":"pt_S3","darkScore":"","winnerTo":"","loserTo":"","gmid":"14G-085"},{"date":"19-Jul","time":"12:50 PM","type":"Group","location":"SADDLEBACK COLLEGE 1","game":89,"whiteRaw":"pt_R1","whiteScore":"","darkRaw":"pt_R3","darkScore":"","winnerTo":"","loserTo":"","gmid":"14G-089"},{"date":"19-Jul","time":"1:40 PM","type":"Group","location":"SADDLEBACK COLLEGE 1","game":93,"whiteRaw":"pt_M1","whiteScore":"","darkRaw":"pt_M2","darkScore":"","winnerTo":"","loserTo":"","gmid":"14G-093"},{"date":"19-Jul","time":"2:30 PM","type":"Group","location":"SADDLEBACK COLLEGE 1","game":97,"whiteRaw":"pt_N1","whiteScore":"","darkRaw":"pt_N2","darkScore":"","winnerTo":"","loserTo":"","gmid":"14G-097"},{"date":"19-Jul","time":"3:20 PM","type":"Group","location":"SADDLEBACK COLLEGE 1","game":101,"whiteRaw":"pt_S2","whiteScore":"","darkRaw":"pt_S3","darkScore":"","winnerTo":"","loserTo":"","gmid":"14G-101"},{"date":"19-Jul","time":"4:10 PM","type":"Group","location":"SADDLEBACK COLLEGE 1","game":105,"whiteRaw":"pt_R2","whiteScore":"","darkRaw":"pt_R3","darkScore":"","winnerTo":"","loserTo":"","gmid":"14G-105"},{"date":"19-Jul","time":"6:40 PM","type":"Play-in","location":"SADDLEBACK COLLEGE 1","game":109,"whiteRaw":"3rd pt_M-","whiteScore":"","darkRaw":"1st pt_S-","darkScore":"","winnerTo":"129","loserTo":"134","gmid":"14G-109"},{"date":"19-Jul","time":"7:30 PM","type":"Play-in","location":"SADDLEBACK COLLEGE 1","game":113,"whiteRaw":"3rd pt_N-","whiteScore":"","darkRaw":"1st pt_R-","darkScore":"","winnerTo":"121","loserTo":"126","gmid":"14G-113"},{"date":"19-Jul","time":"7:00 AM","type":"Group","location":"UC IRVINE 2","game":62,"whiteRaw":"pt_O2","whiteScore":"","darkRaw":"pt_O3","darkScore":"","winnerTo":"","loserTo":"","gmid":"14G-062"},{"date":"19-Jul","time":"7:50 AM","type":"Group","location":"UC IRVINE 2","game":66,"whiteRaw":"pt_P2","whiteScore":"","darkRaw":"pt_P3","darkScore":"","winnerTo":"","loserTo":"","gmid":"14G-066"},{"date":"19-Jul","time":"8:40 AM","type":"Group","location":"UC IRVINE 2","game":70,"whiteRaw":"pt_U1","whiteScore":"","darkRaw":"pt_U2","darkScore":"","winnerTo":"","loserTo":"","gmid":"14G-070"},{"date":"19-Jul","time":"9:30 AM","type":"Group","location":"UC IRVINE 2","game":74,"whiteRaw":"pt_T1","whiteScore":"","darkRaw":"pt_T2","darkScore":"","winnerTo":"","loserTo":"","gmid":"14G-074"},{"date":"19-Jul","time":"10:20 AM","type":"Group","location":"UC IRVINE 2","game":78,"whiteRaw":"pt_O1","whiteScore":"","darkRaw":"pt_O3","darkScore":"","winnerTo":"","loserTo":"","gmid":"14G-078"},{"date":"19-Jul","time":"11:10 AM","type":"Group","location":"UC IRVINE 2","game":82,"whiteRaw":"pt_P1","whiteScore":"","darkRaw":"pt_P3","darkScore":"","winnerTo":"","loserTo":"","gmid":"14G-082"},{"date":"19-Jul","time":"12:00 PM","type":"Group","location":"UC IRVINE 2","game":86,"whiteRaw":"pt_U1","whiteScore":"","darkRaw":"pt_U3","darkScore":"","winnerTo":"","loserTo":"","gmid":"14G-086"},{"date":"19-Jul","time":"12:50 PM","type":"Group","location":"UC IRVINE 2","game":90,"whiteRaw":"pt_T1","whiteScore":"","darkRaw":"pt_T3","darkScore":"","winnerTo":"","loserTo":"","gmid":"14G-090"},{"date":"19-Jul","time":"1:40 PM","type":"Group","location":"UC IRVINE 2","game":94,"whiteRaw":"pt_O1","whiteScore":"","darkRaw":"pt_O2","darkScore":"","winnerTo":"","loserTo":"","gmid":"14G-094"},{"date":"19-Jul","time":"2:30 PM","type":"Group","location":"UC IRVINE 2","game":98,"whiteRaw":"pt_P1","whiteScore":"","darkRaw":"pt_P2","darkScore":"","winnerTo":"","loserTo":"","gmid":"14G-098"},{"date":"19-Jul","time":"3:20 PM","type":"Group","location":"UC IRVINE 2","game":102,"whiteRaw":"pt_U2","whiteScore":"","darkRaw":"pt_U3","darkScore":"","winnerTo":"","loserTo":"","gmid":"14G-102"},{"date":"19-Jul","time":"4:10 PM","type":"Group","location":"UC IRVINE 2","game":106,"whiteRaw":"pt_T2","whiteScore":"","darkRaw":"pt_T3","darkScore":"","winnerTo":"","loserTo":"","gmid":"14G-106"},{"date":"19-Jul","time":"6:40 PM","type":"Play-in","location":"UC IRVINE 2","game":110,"whiteRaw":"3rd pt_O-","whiteScore":"","darkRaw":"1st pt_U-","darkScore":"","winnerTo":"117","loserTo":"138","gmid":"14G-110"},{"date":"19-Jul","time":"7:30 PM","type":"Play-in","location":"UC IRVINE 2","game":114,"whiteRaw":"3rd pt_P-","whiteScore":"","darkRaw":"1st pt_T-","darkScore":"","winnerTo":"125","loserTo":"130","gmid":"14G-114"},{"date":"19-Jul","time":"7:00 AM","type":"Group","location":"GARDEN GROVE HS","game":63,"whiteRaw":"au_S1","whiteScore":"","darkRaw":"au_S2","darkScore":"","winnerTo":"","loserTo":"","gmid":"14G-063"},{"date":"19-Jul","time":"7:50 AM","type":"Group","location":"GARDEN GROVE HS","game":67,"whiteRaw":"au_R1","whiteScore":"","darkRaw":"au_R2","darkScore":"","winnerTo":"","loserTo":"","gmid":"14G-067"},{"date":"19-Jul","time":"8:40 AM","type":"Group","location":"GARDEN GROVE HS","game":71,"whiteRaw":"au_M2","whiteScore":"","darkRaw":"au_M3","darkScore":"","winnerTo":"","loserTo":"","gmid":"14G-071"},{"date":"19-Jul","time":"9:30 AM","type":"Group","location":"GARDEN GROVE HS","game":75,"whiteRaw":"au_N2","whiteScore":"","darkRaw":"au_N3","darkScore":"","winnerTo":"","loserTo":"","gmid":"14G-075"},{"date":"19-Jul","time":"10:20 AM","type":"Group","location":"GARDEN GROVE HS","game":79,"whiteRaw":"au_S1","whiteScore":"","darkRaw":"au_S3","darkScore":"","winnerTo":"","loserTo":"","gmid":"14G-079"},{"date":"19-Jul","time":"11:10 AM","type":"Group","location":"GARDEN GROVE HS","game":83,"whiteRaw":"au_R1","whiteScore":"","darkRaw":"au_R3","darkScore":"","winnerTo":"","loserTo":"","gmid":"14G-083"},{"date":"19-Jul","time":"12:00 PM","type":"Group","location":"GARDEN GROVE HS","game":87,"whiteRaw":"au_M1","whiteScore":"","darkRaw":"au_M3","darkScore":"","winnerTo":"","loserTo":"","gmid":"14G-087"},{"date":"19-Jul","time":"12:50 PM","type":"Group","location":"GARDEN GROVE HS","game":91,"whiteRaw":"au_N1","whiteScore":"","darkRaw":"au_N3","darkScore":"","winnerTo":"","loserTo":"","gmid":"14G-091"},{"date":"19-Jul","time":"1:40 PM","type":"Group","location":"GARDEN GROVE HS","game":95,"whiteRaw":"au_S2","whiteScore":"","darkRaw":"au_S3","darkScore":"","winnerTo":"","loserTo":"","gmid":"14G-095"},{"date":"19-Jul","time":"2:30 PM","type":"Group","location":"GARDEN GROVE HS","game":99,"whiteRaw":"au_R2","whiteScore":"","darkRaw":"au_R3","darkScore":"","winnerTo":"","loserTo":"","gmid":"14G-099"},{"date":"19-Jul","time":"3:20 PM","type":"Group","location":"GARDEN GROVE HS","game":103,"whiteRaw":"au_M1","whiteScore":"","darkRaw":"au_M2","darkScore":"","winnerTo":"","loserTo":"","gmid":"14G-103"},{"date":"19-Jul","time":"4:10 PM","type":"Group","location":"GARDEN GROVE HS","game":107,"whiteRaw":"au_N1","whiteScore":"","darkRaw":"au_N2","darkScore":"","winnerTo":"","loserTo":"","gmid":"14G-107"},{"date":"19-Jul","time":"6:40 PM","type":"Play-in","location":"GARDEN GROVE HS","game":111,"whiteRaw":"3rd au_M-","whiteScore":"","darkRaw":"1st au_S-","darkScore":"","winnerTo":"131","loserTo":"136","gmid":"14G-111"},{"date":"19-Jul","time":"7:30 PM","type":"Play-in","location":"GARDEN GROVE HS","game":115,"whiteRaw":"3rd au_N-","whiteScore":"","darkRaw":"1st au_R-","darkScore":"","winnerTo":"123","loserTo":"128","gmid":"14G-115"},{"date":"19-Jul","time":"7:00 AM","type":"Group","location":"OCEAN VIEW HS 1","game":64,"whiteRaw":"au_U1","whiteScore":"","darkRaw":"au_U2","darkScore":"","winnerTo":"","loserTo":"","gmid":"14G-064"},{"date":"19-Jul","time":"7:50 AM","type":"Group","location":"OCEAN VIEW HS 1","game":68,"whiteRaw":"au_T1","whiteScore":"","darkRaw":"au_T2","darkScore":"","winnerTo":"","loserTo":"","gmid":"14G-068"},{"date":"19-Jul","time":"8:40 AM","type":"Group","location":"OCEAN VIEW HS 1","game":72,"whiteRaw":"au_O2","whiteScore":"","darkRaw":"au_O3","darkScore":"","winnerTo":"","loserTo":"","gmid":"14G-072"},{"date":"19-Jul","time":"9:30 AM","type":"Group","location":"OCEAN VIEW HS 1","game":76,"whiteRaw":"au_P2","whiteScore":"","darkRaw":"au_P3","darkScore":"","winnerTo":"","loserTo":"","gmid":"14G-076"},{"date":"19-Jul","time":"10:20 AM","type":"Group","location":"OCEAN VIEW HS 1","game":80,"whiteRaw":"au_U1","whiteScore":"","darkRaw":"au_U3","darkScore":"","winnerTo":"","loserTo":"","gmid":"14G-080"},{"date":"19-Jul","time":"11:10 AM","type":"Group","location":"OCEAN VIEW HS 1","game":84,"whiteRaw":"au_T1","whiteScore":"","darkRaw":"au_T3","darkScore":"","winnerTo":"","loserTo":"","gmid":"14G-084"},{"date":"19-Jul","time":"12:00 PM","type":"Group","location":"OCEAN VIEW HS 1","game":88,"whiteRaw":"au_O1","whiteScore":"","darkRaw":"au_O3","darkScore":"","winnerTo":"","loserTo":"","gmid":"14G-088"},{"date":"19-Jul","time":"12:50 PM","type":"Group","location":"OCEAN VIEW HS 1","game":92,"whiteRaw":"au_P1","whiteScore":"","darkRaw":"au_P3","darkScore":"","winnerTo":"","loserTo":"","gmid":"14G-092"},{"date":"19-Jul","time":"1:40 PM","type":"Group","location":"OCEAN VIEW HS 1","game":96,"whiteRaw":"au_U2","whiteScore":"","darkRaw":"au_U3","darkScore":"","winnerTo":"","loserTo":"","gmid":"14G-096"},{"date":"19-Jul","time":"2:30 PM","type":"Group","location":"OCEAN VIEW HS 1","game":100,"whiteRaw":"au_T2","whiteScore":"","darkRaw":"au_T3","darkScore":"","winnerTo":"","loserTo":"","gmid":"14G-100"},{"date":"19-Jul","time":"3:20 PM","type":"Group","location":"OCEAN VIEW HS 1","game":104,"whiteRaw":"au_O1","whiteScore":"","darkRaw":"au_O2","darkScore":"","winnerTo":"","loserTo":"","gmid":"14G-104"},{"date":"19-Jul","time":"4:10 PM","type":"Group","location":"OCEAN VIEW HS 1","game":108,"whiteRaw":"au_P1","whiteScore":"","darkRaw":"au_P2","darkScore":"","winnerTo":"","loserTo":"","gmid":"14G-108"},{"date":"19-Jul","time":"6:40 PM","type":"Play-in","location":"OCEAN VIEW HS 1","game":112,"whiteRaw":"3rd au_O-","whiteScore":"","darkRaw":"1st au_U-","darkScore":"","winnerTo":"119","loserTo":"140","gmid":"14G-112"},{"date":"19-Jul","time":"7:30 PM","type":"Play-in","location":"OCEAN VIEW HS 1","game":116,"whiteRaw":"3rd au_P-","whiteScore":"","darkRaw":"1st au_T-","darkScore":"","winnerTo":"127","loserTo":"132","gmid":"14G-116"},{"date":"20-Jul","time":"8:00 AM","type":"5-8 v 9-12","location":"UC IRVINE 1","game":117,"whiteRaw":"2nd pt_P-","whiteScore":"","darkRaw":"W110","darkScore":"","winnerTo":"141","loserTo":"149","gmid":"14G-117"},{"date":"20-Jul","time":"9:00 AM","type":"5-8 v 9-12","location":"UC IRVINE 1","game":121,"whiteRaw":"2nd pt_M-","whiteScore":"","darkRaw":"W113","darkScore":"","winnerTo":"141","loserTo":"149","gmid":"14G-121"},{"date":"20-Jul","time":"10:00 AM","type":"5-8 v 9-12","location":"UC IRVINE 1","game":125,"whiteRaw":"2nd pt_O-","whiteScore":"","darkRaw":"W114","darkScore":"","winnerTo":"145","loserTo":"153","gmid":"14G-125"},{"date":"20-Jul","time":"11:00 AM","type":"5-8 v 9-12","location":"UC IRVINE 1","game":129,"whiteRaw":"2nd pt_N-","whiteScore":"","darkRaw":"W109","darkScore":"","winnerTo":"145","loserTo":"153","gmid":"14G-129"},{"date":"20-Jul","time":"12:00 PM","type":"1-2 v 3-4","location":"UC IRVINE 1","game":133,"whiteRaw":"1st pt_N-","whiteScore":"","darkRaw":"1st pt_O-","darkScore":"","winnerTo":"174","loserTo":"157","gmid":"14G-133"},{"date":"20-Jul","time":"1:00 PM","type":"1-2 v 3-4","location":"UC IRVINE 1","game":137,"whiteRaw":"1st pt_M-","whiteScore":"","darkRaw":"1st pt_P-","darkScore":"","winnerTo":"173","loserTo":"161","gmid":"14G-137"},{"date":"20-Jul","time":"2:00 PM","type":"5-6 v 7-8","location":"UC IRVINE 1","game":141,"whiteRaw":"W117","whiteScore":"","darkRaw":"W121","darkScore":"","winnerTo":"157","loserTo":"185","gmid":"14G-141"},{"date":"20-Jul","time":"3:00 PM","type":"5-6 v 7-8","location":"UC IRVINE 1","game":145,"whiteRaw":"W125","whiteScore":"","darkRaw":"W129","darkScore":"","winnerTo":"161","loserTo":"185","gmid":"14G-145"},{"date":"20-Jul","time":"4:00 PM","type":"9-12 semi","location":"UC IRVINE 1","game":149,"whiteRaw":"L121","whiteScore":"","darkRaw":"L117","darkScore":"","winnerTo":"182","loserTo":"181","gmid":"14G-149"},{"date":"20-Jul","time":"5:00 PM","type":"9-12 semi","location":"UC IRVINE 1","game":153,"whiteRaw":"L129","whiteScore":"","darkRaw":"L125","darkScore":"","winnerTo":"182","loserTo":"181","gmid":"14G-153"},{"date":"20-Jul","time":"6:00 PM","type":"play to semi","location":"UC IRVINE 1","game":157,"whiteRaw":"L133","whiteScore":"","darkRaw":"W141","darkScore":"","winnerTo":"173","loserTo":"186","gmid":"14G-157"},{"date":"20-Jul","time":"7:00 PM","type":"play to semi","location":"UC IRVINE 1","game":161,"whiteRaw":"L137","whiteScore":"","darkRaw":"W145","darkScore":"","winnerTo":"174","loserTo":"186","gmid":"14G-161"},{"date":"20-Jul","time":"8:00 AM","type":"21-24 RR","location":"UC IRVINE 2","game":118,"whiteRaw":"3rd pt_U-","whiteScore":"","darkRaw":"3rd pt_R-","darkScore":"","winnerTo":"","loserTo":"","gmid":"14G-118"},{"date":"20-Jul","time":"9:00 AM","type":"21-24 RR","location":"UC IRVINE 2","game":122,"whiteRaw":"3rd pt_T-","whiteScore":"","darkRaw":"3rd pt_S-","darkScore":"","winnerTo":"","loserTo":"","gmid":"14G-122"},{"date":"20-Jul","time":"10:00 AM","type":"13-20 qtr","location":"UC IRVINE 2","game":126,"whiteRaw":"L113","whiteScore":"","darkRaw":"2nd pt_U-","darkScore":"","winnerTo":"150","loserTo":"154","gmid":"14G-126"},{"date":"20-Jul","time":"11:00 AM","type":"13-20 qtr","location":"UC IRVINE 2","game":130,"whiteRaw":"L114","whiteScore":"","darkRaw":"2nd pt_S-","darkScore":"","winnerTo":"150","loserTo":"154","gmid":"14G-130"},{"date":"20-Jul","time":"12:00 PM","type":"13-20 qtr","location":"UC IRVINE 2","game":134,"whiteRaw":"L109","whiteScore":"","darkRaw":"2nd pt_T-","darkScore":"","winnerTo":"158","loserTo":"162","gmid":"14G-134"},{"date":"20-Jul","time":"1:00 PM","type":"13-20 qtr","location":"UC IRVINE 2","game":138,"whiteRaw":"L110","whiteScore":"","darkRaw":"2nd pt_R-","darkScore":"","winnerTo":"158","loserTo":"162","gmid":"14G-138"},{"date":"20-Jul","time":"2:00 PM","type":"21-24 RR","location":"UC IRVINE 2","game":142,"whiteRaw":"3rd pt_U-","whiteScore":"","darkRaw":"3rd pt_S-","darkScore":"","winnerTo":"","loserTo":"","gmid":"14G-142"},{"date":"20-Jul","time":"3:00 PM","type":"21-24 RR","location":"UC IRVINE 2","game":146,"whiteRaw":"3rd pt_T-","whiteScore":"","darkRaw":"3rd pt_R-","darkScore":"","winnerTo":"","loserTo":"","gmid":"14G-146"},{"date":"20-Jul","time":"4:00 PM","type":"13-16 semi","location":"UC IRVINE 2","game":150,"whiteRaw":"W126","whiteScore":"","darkRaw":"W130","darkScore":"","winnerTo":"178","loserTo":"177","gmid":"14G-150"},{"date":"20-Jul","time":"5:00 PM","type":"17-20 semi","location":"UC IRVINE 2","game":154,"whiteRaw":"L130","whiteScore":"","darkRaw":"L126","darkScore":"","winnerTo":"170","loserTo":"169","gmid":"14G-154"},{"date":"20-Jul","time":"6:00 PM","type":"13-16 semi","location":"UC IRVINE 2","game":158,"whiteRaw":"W134","whiteScore":"","darkRaw":"W138","darkScore":"","winnerTo":"178","loserTo":"177","gmid":"14G-158"},{"date":"20-Jul","time":"7:00 PM","type":"17-20 semi","location":"UC IRVINE 2","game":162,"whiteRaw":"L138","whiteScore":"","darkRaw":"L134","darkScore":"","winnerTo":"170","loserTo":"169","gmid":"14G-162"},{"date":"20-Jul","time":"8:00 AM","type":"5-8 v 9-12","location":"LA SERNA HS","game":119,"whiteRaw":"2nd au_P-","whiteScore":"","darkRaw":"W112","darkScore":"","winnerTo":"143","loserTo":"151","gmid":"14G-119"},{"date":"20-Jul","time":"9:00 AM","type":"5-8 v 9-12","location":"LA SERNA HS","game":123,"whiteRaw":"2nd au_M-","whiteScore":"","darkRaw":"W115","darkScore":"","winnerTo":"143","loserTo":"151","gmid":"14G-123"},{"date":"20-Jul","time":"10:00 AM","type":"5-8 v 9-12","location":"LA SERNA HS","game":127,"whiteRaw":"2nd au_O-","whiteScore":"","darkRaw":"W116","darkScore":"","winnerTo":"147","loserTo":"155","gmid":"14G-127"},{"date":"20-Jul","time":"11:00 AM","type":"5-8 v 9-12","location":"LA SERNA HS","game":131,"whiteRaw":"2nd au_N-","whiteScore":"","darkRaw":"W111","darkScore":"","winnerTo":"147","loserTo":"155","gmid":"14G-131"},{"date":"20-Jul","time":"12:00 PM","type":"1-2 v 3-4","location":"LA SERNA HS","game":135,"whiteRaw":"1st au_N-","whiteScore":"","darkRaw":"1st au_O-","darkScore":"","winnerTo":"172","loserTo":"159","gmid":"14G-135"},{"date":"20-Jul","time":"1:00 PM","type":"1-2 v 3-4","location":"LA SERNA HS","game":139,"whiteRaw":"1st au_M-","whiteScore":"","darkRaw":"1st au_P-","darkScore":"","winnerTo":"171","loserTo":"163","gmid":"14G-139"},{"date":"20-Jul","time":"2:00 PM","type":"5-6 v 7-8","location":"LA SERNA HS","game":143,"whiteRaw":"W119","whiteScore":"","darkRaw":"W123","darkScore":"","winnerTo":"159","loserTo":"188","gmid":"14G-143"},{"date":"20-Jul","time":"3:00 PM","type":"5-6 v 7-8","location":"LA SERNA HS","game":147,"whiteRaw":"W127","whiteScore":"","darkRaw":"W131","darkScore":"","winnerTo":"163","loserTo":"188","gmid":"14G-147"},{"date":"20-Jul","time":"4:00 PM","type":"9-12 semi","location":"LA SERNA HS","game":151,"whiteRaw":"L123","whiteScore":"","darkRaw":"L119","darkScore":"","winnerTo":"183","loserTo":"184","gmid":"14G-151"},{"date":"20-Jul","time":"5:00 PM","type":"9-12 semi","location":"LA SERNA HS","game":155,"whiteRaw":"L131","whiteScore":"","darkRaw":"L127","darkScore":"","winnerTo":"183","loserTo":"184","gmid":"14G-155"},{"date":"20-Jul","time":"6:00 PM","type":"play to semi","location":"LA SERNA HS","game":159,"whiteRaw":"L135","whiteScore":"","darkRaw":"W143","darkScore":"","winnerTo":"171","loserTo":"187","gmid":"14G-159"},{"date":"20-Jul","time":"7:00 PM","type":"play to semi","location":"LA SERNA HS","game":163,"whiteRaw":"L139","whiteScore":"","darkRaw":"W147","darkScore":"","winnerTo":"172","loserTo":"187","gmid":"14G-163"},{"date":"20-Jul","time":"8:00 AM","type":"21-24 RR","location":"LONG BEACH CC 2","game":120,"whiteRaw":"3rd au_U-","whiteScore":"","darkRaw":"3rd au_R-","darkScore":"","winnerTo":"","loserTo":"","gmid":"14G-120"},{"date":"20-Jul","time":"9:00 AM","type":"21-24 RR","location":"LONG BEACH CC 2","game":124,"whiteRaw":"3rd au_T-","whiteScore":"","darkRaw":"3rd au_S-","darkScore":"","winnerTo":"","loserTo":"","gmid":"14G-124"},{"date":"20-Jul","time":"10:00 AM","type":"13-20 qtr","location":"LONG BEACH CC 2","game":128,"whiteRaw":"L115","whiteScore":"","darkRaw":"2nd au_U-","darkScore":"","winnerTo":"152","loserTo":"156","gmid":"14G-128"},{"date":"20-Jul","time":"11:00 AM","type":"13-20 qtr","location":"LONG BEACH CC 2","game":132,"whiteRaw":"L116","whiteScore":"","darkRaw":"2nd au_S-","darkScore":"","winnerTo":"152","loserTo":"156","gmid":"14G-132"},{"date":"20-Jul","time":"12:00 PM","type":"13-20 qtr","location":"LONG BEACH CC 2","game":136,"whiteRaw":"L111","whiteScore":"","darkRaw":"2nd au_T-","darkScore":"","winnerTo":"160","loserTo":"164","gmid":"14G-136"},{"date":"20-Jul","time":"1:00 PM","type":"13-20 qtr","location":"LONG BEACH CC 2","game":140,"whiteRaw":"L112","whiteScore":"","darkRaw":"2nd au_R-","darkScore":"","winnerTo":"160","loserTo":"164","gmid":"14G-140"},{"date":"20-Jul","time":"2:00 PM","type":"21-24 RR","location":"LONG BEACH CC 2","game":144,"whiteRaw":"3rd au_U-","whiteScore":"","darkRaw":"3rd au_S-","darkScore":"","winnerTo":"","loserTo":"","gmid":"14G-144"},{"date":"20-Jul","time":"3:00 PM","type":"21-24 RR","location":"LONG BEACH CC 2","game":148,"whiteRaw":"3rd au_T-","whiteScore":"","darkRaw":"3rd au_R-","darkScore":"","winnerTo":"","loserTo":"","gmid":"14G-148"},{"date":"20-Jul","time":"4:00 PM","type":"13-16 semi","location":"LONG BEACH CC 2","game":152,"whiteRaw":"W128","whiteScore":"","darkRaw":"W132","darkScore":"","winnerTo":"179","loserTo":"180","gmid":"14G-152"},{"date":"20-Jul","time":"5:00 PM","type":"17-20 semi","location":"LONG BEACH CC 2","game":156,"whiteRaw":"L132","whiteScore":"","darkRaw":"L128","darkScore":"","winnerTo":"175","loserTo":"176","gmid":"14G-156"},{"date":"20-Jul","time":"6:00 PM","type":"13-16 semi","location":"LONG BEACH CC 2","game":160,"whiteRaw":"W136","whiteScore":"","darkRaw":"W140","darkScore":"","winnerTo":"179","loserTo":"180","gmid":"14G-160"},{"date":"20-Jul","time":"7:00 PM","type":"17-20 semi","location":"LONG BEACH CC 2","game":164,"whiteRaw":"L140","whiteScore":"","darkRaw":"L136","darkScore":"","winnerTo":"175","loserTo":"176","gmid":"14G-164"},{"date":"21-Jul","time":"7:00 AM","type":"21-24 RR","location":"UC IRVINE 2","game":165,"whiteRaw":"3rd pt_T-","whiteScore":"","darkRaw":"3rd pt_U-","darkScore":"","winnerTo":"","loserTo":"","gmid":"14G-165"},{"date":"21-Jul","time":"8:00 AM","type":"21-24 RR","location":"UC IRVINE 2","game":166,"whiteRaw":"3rd pt_R-","whiteScore":"","darkRaw":"3rd pt_S-","darkScore":"","winnerTo":"","loserTo":"","gmid":"14G-166"},{"date":"21-Jul","time":"9:00 AM","type":"semi","location":"UC IRVINE 2","game":174,"whiteRaw":"W133","whiteScore":"","darkRaw":"W161","darkScore":"","winnerTo":"192","loserTo":"191","gmid":"14G-174"},{"date":"21-Jul","time":"10:00 AM","type":"13th","location":"UC IRVINE 2","game":178,"whiteRaw":"W150","whiteScore":"","darkRaw":"W158","darkScore":"","winnerTo":"13th","loserTo":"14th","gmid":"14G-178"},{"date":"21-Jul","time":"11:00 AM","type":"15th","location":"UC IRVINE 2","game":177,"whiteRaw":"L150","whiteScore":"","darkRaw":"L158","darkScore":"","winnerTo":"15th","loserTo":"16th","gmid":"14G-177"},{"date":"21-Jul","time":"12:00 PM","type":"17th","location":"UC IRVINE 2","game":170,"whiteRaw":"W154","whiteScore":"","darkRaw":"W162","darkScore":"","winnerTo":"17th","loserTo":"18th","gmid":"14G-170"},{"date":"21-Jul","time":"1:00 PM","type":"19th","location":"UC IRVINE 2","game":169,"whiteRaw":"L154","whiteScore":"","darkRaw":"L162","darkScore":"","winnerTo":"19th","loserTo":"20th","gmid":"14G-169"},{"date":"21-Jul","time":"7:00 AM","type":"21-24 RR","location":"GARDEN GROVE HS","game":167,"whiteRaw":"3rd au_T-","whiteScore":"","darkRaw":"3rd au_U-","darkScore":"","winnerTo":"","loserTo":"","gmid":"14G-167"},{"date":"21-Jul","time":"8:00 AM","type":"21-24 RR","location":"GARDEN GROVE HS","game":168,"whiteRaw":"3rd au_R-","whiteScore":"","darkRaw":"3rd au_S-","darkScore":"","winnerTo":"","loserTo":"","gmid":"14G-168"},{"date":"21-Jul","time":"9:00 AM","type":"9th","location":"GARDEN GROVE HS","game":183,"whiteRaw":"W151","whiteScore":"","darkRaw":"W155","darkScore":"","winnerTo":"9th","loserTo":"10th","gmid":"14G-183"},{"date":"21-Jul","time":"10:00 AM","type":"11th","location":"GARDEN GROVE HS","game":184,"whiteRaw":"L151","whiteScore":"","darkRaw":"L155","darkScore":"","winnerTo":"11th","loserTo":"12th","gmid":"14G-184"},{"date":"21-Jul","time":"11:00 AM","type":"13th","location":"GARDEN GROVE HS","game":179,"whiteRaw":"W152","whiteScore":"","darkRaw":"W160","darkScore":"","winnerTo":"13th","loserTo":"14th","gmid":"14G-179"},{"date":"21-Jul","time":"12:00 PM","type":"15th","location":"GARDEN GROVE HS","game":180,"whiteRaw":"L152","whiteScore":"","darkRaw":"L160","darkScore":"","winnerTo":"15th","loserTo":"16th","gmid":"14G-180"},{"date":"21-Jul","time":"1:00 PM","type":"17th","location":"GARDEN GROVE HS","game":175,"whiteRaw":"W156","whiteScore":"","darkRaw":"W164","darkScore":"","winnerTo":"17th","loserTo":"18th","gmid":"14G-175"},{"date":"21-Jul","time":"7:00 AM","type":"7th","location":"UC IRVINE 1","game":185,"whiteRaw":"L141","whiteScore":"","darkRaw":"L145","darkScore":"","winnerTo":"7th","loserTo":"8th","gmid":"14G-185"},{"date":"21-Jul","time":"8:00 AM","type":"5th","location":"UC IRVINE 1","game":186,"whiteRaw":"L157","whiteScore":"","darkRaw":"L161","darkScore":"","winnerTo":"5th","loserTo":"6th","gmid":"14G-186"},{"date":"21-Jul","time":"9:00 AM","type":"semi","location":"UC IRVINE 1","game":173,"whiteRaw":"W137","whiteScore":"","darkRaw":"W157","darkScore":"","winnerTo":"192","loserTo":"191","gmid":"14G-173"},{"date":"21-Jul","time":"10:00 AM","type":"9th","location":"UC IRVINE 1","game":182,"whiteRaw":"W149","whiteScore":"","darkRaw":"W153","darkScore":"","winnerTo":"9th","loserTo":"10th","gmid":"14G-182"},{"date":"21-Jul","time":"11:00 AM","type":"11th","location":"UC IRVINE 1","game":181,"whiteRaw":"L149","whiteScore":"","darkRaw":"L153","darkScore":"","winnerTo":"11th","loserTo":"12th","gmid":"14G-181"},{"date":"21-Jul","time":"7:00 AM","type":"semi","location":"LONG BEACH CC 2","game":171,"whiteRaw":"W139","whiteScore":"","darkRaw":"W159","darkScore":"","winnerTo":"190","loserTo":"189","gmid":"14G-171"},{"date":"21-Jul","time":"8:00 AM","type":"semi","location":"LONG BEACH CC 2","game":172,"whiteRaw":"W135","whiteScore":"","darkRaw":"W163","darkScore":"","winnerTo":"190","loserTo":"189","gmid":"14G-172"},{"date":"21-Jul","time":"9:00 AM","type":"5th","location":"LONG BEACH CC 2","game":187,"whiteRaw":"L159","whiteScore":"","darkRaw":"L163","darkScore":"","winnerTo":"5th","loserTo":"6th","gmid":"14G-187"},{"date":"21-Jul","time":"10:00 AM","type":"7th","location":"LONG BEACH CC 2","game":188,"whiteRaw":"L143","whiteScore":"","darkRaw":"L147","darkScore":"","winnerTo":"7th","loserTo":"8th","gmid":"14G-188"},{"date":"21-Jul","time":"11:00 AM","type":"3rd","location":"LONG BEACH CC 2","game":189,"whiteRaw":"L171","whiteScore":"","darkRaw":"L172","darkScore":"","winnerTo":"3rd","loserTo":"4th","gmid":"14G-189"},{"date":"21-Jul","time":"12:00 PM","type":"1st","location":"LONG BEACH CC 2","game":190,"whiteRaw":"W171","whiteScore":"","darkRaw":"W172","darkScore":"","winnerTo":"1st","loserTo":"2nd","gmid":"14G-190"},{"date":"21-Jul","time":"1:00 PM","type":"19th","location":"LONG BEACH CC 2","game":176,"whiteRaw":"L156","whiteScore":"","darkRaw":"L164","darkScore":"","winnerTo":"19th","loserTo":"20th","gmid":"14G-176"},{"date":"21-Jul","time":"2:30 PM","type":"3rd","location":"WOOLLETT LEFT","game":191,"whiteRaw":"L173","whiteScore":"","darkRaw":"L174","darkScore":"","winnerTo":"3rd","loserTo":"4th","gmid":"14G-191"},{"date":"21-Jul","time":"2:30 PM","type":"1st","location":"WOOLLETT RIGHT","game":192,"whiteRaw":"W173","whiteScore":"","darkRaw":"W174","darkScore":"","winnerTo":"1st","loserTo":"2nd","gmid":"14G-192"}]}};
const REFRESH_MS=120000;
const ACTIVE_REFRESH_MIN_MS=30000;
const CACHE_PREFIX='joGirlsScheduleV5:';
const ACRONYMS=new Set(['SD','CDM','LB','CC','WPC','CHAWP','LOWPO','SHAQ','OCWPC','ECA','ASA','CMAC','TPC','WCAC','SET','LA','OC','USA','CIU']);
const age=$('age'),division=$('division'),team=$('team'),summary=$('summary'),next=$('next'),journey=$('journey'),paths=$('paths'),potential=$('potential'),schedule=$('schedule'),search=$('search'),day=$('day'),share=$('share');
let DATA={teams:[],games:[]},RESOLVED={games:[],map:new Map(),slots:new Map(),placements:new Map(),seedLookup:new Map()},loadVersion=0,refreshTimer=null,lastLoadAttemptAt=0;

function $(id){return document.getElementById(id)}
function esc(value){return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]))}
function currentConfig(){return DATASETS.find(d=>d.id===division.value)||null}
function identityContext(){const config=currentConfig();const label=String(config?.division||'');const gender=/girls/i.test(label)?'Girls':/boys/i.test(label)?'Boys':/coed/i.test(label)?'Coed':'';return{season:'2026',ageGroup:config?.age||'',gender}}
function canonicalIdentity(name){return window.CPIIdentity?.resolveTeam?.(name,identityContext())||null}
function identityAttributes(name){const identity=canonicalIdentity(name);return identity?` data-cpi-team-id="${esc(identity.id)}" data-cpi-club-id="${esc(identity.clubId)}"`:''}
function updateSheetLink(){
  const config=currentConfig(),link=$('sheetLink');
  if(!link)return;
  if(!config){
    link.href='#';
    link.setAttribute('aria-disabled','true');
    return;
  }
  link.href=`https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit?gid=${config.gid}#gid=${config.gid}`;
  link.setAttribute('aria-label',`View ${config.age} ${config.division} full division schedule in Google Sheets`);
  link.removeAttribute('aria-disabled');
}

function unique(values){return [...new Set(values.filter(Boolean).map(String))]}
function datasetUrls(config){
  const root=`https://docs.google.com/spreadsheets/d/${SHEET_ID}`;
  const gids=unique([config.gid,...(config.gidAliases||[])]);
  const urls=[];
  for(const gid of gids){
    urls.push(`${root}/gviz/tq?tqx=out:csv&gid=${encodeURIComponent(gid)}`);
    urls.push(`${root}/gviz/tq?gid=${encodeURIComponent(gid)}&tqx=out:csv`);
    urls.push(`${root}/export?format=csv&gid=${encodeURIComponent(gid)}`);
  }
  if(config.sheetName){
    const sheet=encodeURIComponent(config.sheetName);
    urls.push(`${root}/gviz/tq?tqx=out:csv&sheet=${sheet}`);
  }
  return unique(urls);
}
function jsonpUrls(config,callbackName){
  const root=`https://docs.google.com/spreadsheets/d/${SHEET_ID}`;
  const gids=unique([config.gid,...(config.gidAliases||[])]);
  const urls=[];
  for(const gid of gids){urls.push(`${root}/gviz/tq?tqx=out:json;responseHandler:${callbackName}&gid=${encodeURIComponent(gid)}`)}
  if(config.sheetName){urls.push(`${root}/gviz/tq?tqx=out:json;responseHandler:${callbackName}&sheet=${encodeURIComponent(config.sheetName)}`)}
  return unique(urls);
}
function exportUrl(config){return `https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit?gid=${config.gid}#gid=${config.gid}`}

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
function mappedGame(row,map){
  const get=i=>i>=0?String(row[i]||'').trim():'';
  const gameRaw=get(map.game),gmid=get(map.gmid),date=get(map.date),time=get(map.time);
  if(!/^\d+$/.test(gameRaw)||!/[A-Za-z0-9_-]+-\d{3}$/.test(gmid)||!date||!time)return null;
  return{date,time,type:get(map.type),stageDetail:get(map.stageDetail),location:get(map.location),game:Number(gameRaw),whiteRaw:get(map.white),whiteScore:get(map.whiteScore),darkRaw:get(map.dark),darkScore:get(map.darkScore),winnerTo:normalizeDestination(get(map.winnerTo)),loserTo:normalizeDestination(get(map.loserTo)),gmid};
}
function inferredGame(row){
  const cells=row.map(v=>String(v??'').trim());
  const gmidIndex=cells.findIndex(v=>/^[A-Za-z0-9_-]+-\d{3}$/.test(v));
  if(gmidIndex<0)return null;
  const dateIndex=cells.findIndex((v,i)=>i<gmidIndex&&(/^\d{1,2}-[A-Za-z]{3}$/.test(v)||/^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(v)));
  if(dateIndex<0)return null;
  const timeIndex=cells.findIndex((v,i)=>i>dateIndex&&i<gmidIndex&&/^\d{1,2}:\d{2}\s*(AM|PM)$/i.test(v));
  if(timeIndex<0)return null;
  const gameIndex=cells.findIndex((v,i)=>i>timeIndex&&i<gmidIndex&&/^\d+$/.test(v));
  if(gameIndex<0)return null;
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
    date:cells[dateIndex],time:cells[timeIndex],type:cells[timeIndex+1]||'',stageDetail:cells[gmidIndex+2]||'',location:cells[gameIndex-1]||'',game:Number(cells[gameIndex]),
    whiteRaw:cells[white],whiteScore:scoreBetween,darkRaw:cells[dark],darkScore:scoreAfter,
    winnerTo:normalizeDestination(cells[gmidIndex-2]),loserTo:normalizeDestination(cells[gmidIndex-1]),gmid:cells[gmidIndex]
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
function fetchJsonp(url,timeoutMs=12000){
  return new Promise((resolve,reject)=>{
    const callback=`joJsonp_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const script=document.createElement('script');
    let timer;
    window[callback]=(payload)=>{cleanup();resolve(payload)};
    function cleanup(){clearTimeout(timer);delete window[callback];script.remove()}
    timer=setTimeout(()=>{cleanup();reject(new Error('Google JSONP timeout'))},timeoutMs);
    script.onerror=()=>{cleanup();reject(new Error('Google JSONP failed'))};
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
async function fetchDataset(config){
  const errors=[];
  for(const url of datasetUrls(config)){
    try{
      const response=await fetch(`${url}${url.includes('?')?'&':'?'}_=${Date.now()}`,{cache:'no-store',redirect:'follow'});
      if(!response.ok)throw new Error(`HTTP ${response.status}`);
      const text=await response.text();
      if(looksLikeHtml(text))throw new Error('Google returned HTML instead of CSV');
      const result=validateGames(parseLive(text));
      result.url=url;result.method='csv';return result;
    }catch(error){errors.push(`CSV ${error?.message||String(error)}`)}
  }
  for(const urlTemplate of jsonpUrls(config,'__CALLBACK__')){
    try{
      const payload=await fetchJsonp(urlTemplate);
      if(payload&&payload.status==='error')throw new Error(payload.errors?.map(e=>e.detailed_message||e.message).join('; ')||'Google returned query error');
      const rows=rowsFromGviz(payload);
      const result=validateGames(parseRows(rows));
      result.url=urlTemplate;result.method='jsonp';return result;
    }catch(error){errors.push(`JSONP ${error?.message||String(error)}`)}
  }
  throw new Error(errors.slice(-5).join(' | '));
}
function normalizeDestination(value){let v=String(value||'').trim();let m=v.match(/^[WL]-?(\d+)$/i);if(m)return m[1];m=v.match(/^[WL]-?([a-z]{2}_[A-Z]\d)$/i);if(m)return m[1];return v.replace(/-$/,'')}
function titleTeam(name){return String(name||'').trim().replace(/\(Seed-Team Name\)$/i,'').trim().split(/\s+/).map(word=>{const upper=word.toUpperCase();if(ACRONYMS.has(upper))return upper;if(/^\d+$/.test(word))return word;return word.charAt(0).toUpperCase()+word.slice(1).toLowerCase()}).join(' ')}
function seedInfo(raw){
  const value=String(raw||'').trim(),dash=value.indexOf('-');if(dash<1)return null;
  const prefix=value.slice(0,dash).replace(/\s+/g,''),name=value.slice(dash+1).trim();
  if(!name||!(/^[A-Z]\d?\(\d+\)$/i.test(prefix)||/^[A-Z]\(\d+\)$/i.test(prefix)||/^\d+$/.test(prefix)))return null;
  const group=/^[A-Z]/i.test(prefix)?prefix[0].toUpperCase():null;
  const seedMatch=prefix.match(/\((\d+)\)$/)||prefix.match(/^(\d+)$/);return{team:titleTeam(name),group,seed:seedMatch?Number(seedMatch[1]):999};
}
function smartTeam(raw){return seedInfo(raw)?.team||null}
function parseWL(raw){const m=String(raw||'').trim().match(/^([WL])#?(\d+)(?:\s*[-–—:]\s*.*)?$/i);return m?{kind:m[1].toUpperCase(),game:Number(m[2])}:null}
function normalizeRouteToken(raw){return String(raw||'').trim().replace(/\s+/g,'').replace(/[-–—:]+$/,'')}
function parsePoolSlot(raw){const value=normalizeRouteToken(raw),m=value.match(/^([A-Za-z]{2})_?([A-Z])(\d)$/i);return m?{track:m[1].toLowerCase(),pool:m[2].toUpperCase(),seed:Number(m[3]),key:`${m[1].toLowerCase()}_${m[2].toUpperCase()}${m[3]}`} : null}
function parsePoolPlacement(raw){const m=String(raw||'').trim().replace(/-$/,'').match(/^(1st|2nd|3rd)\s+([A-Za-z]{2})_([A-Z])$/i);return m?{rank:Number(m[1][0]),track:m[2].toLowerCase(),pool:m[3].toUpperCase(),key:`${m[2].toLowerCase()}_${m[3].toUpperCase()}`} : null}
function parseGroupPlacement(raw){const v=String(raw||'').trim().replace(/-$/,'').replace(/_/g,' ');const m=v.match(/^(1st|2nd|3rd)\s+([A-Z])$/i);return m?{rank:Number(m[1][0]),group:m[2].toUpperCase(),key:m[2].toUpperCase()}:null}
function trackLabel(track){return track==='pt'?'Platinum':track==='au'?'Gold':track.toUpperCase()}
function slotLabel(raw){const team=smartTeam(raw);if(team)return team;const wl=parseWL(raw);if(wl)return`${wl.kind==='W'?'Winner':'Loser'} of Game ${wl.game}`;const slot=parsePoolSlot(raw);if(slot)return`${trackLabel(slot.track)} Pool ${slot.pool} Seed ${slot.seed}`;const pp=parsePoolPlacement(raw);if(pp)return`${['','1st','2nd','3rd'][pp.rank]} in ${trackLabel(pp.track)} Pool ${pp.pool}`;const gp=parseGroupPlacement(raw);if(gp)return`${['','1st','2nd','3rd'][gp.rank]} in Group ${gp.group}`;return String(raw||'').replace(/_/g,' ')||'TBD'}
function teamsFromGames(games){return[...new Set(games.flatMap(g=>[smartTeam(g.whiteRaw),smartTeam(g.darkRaw)]).filter(Boolean))].sort((a,b)=>a.localeCompare(b))}
function isFinal(g){return scoreOutcome(g)!==null}
function outcome(g){if(!g)return null;const side=scoreOutcome(g);if(!side||!g.whiteTeam||!g.darkTeam)return null;return side==='white'?{winner:g.whiteTeam,loser:g.darkTeam}:{winner:g.darkTeam,loser:g.whiteTeam}}
function rankTable(teamNames,games,seedLookup){
  const table=new Map(teamNames.map(t=>[t,{team:t,wins:0,gd:0,gf:0,seed:seedLookup.get(t)??999}]));
  for(const g of games){if(!isFinal(g)||!g.whiteTeam||!g.darkTeam)continue;for(const t of [g.whiteTeam,g.darkTeam])if(!table.has(t))table.set(t,{team:t,wins:0,gd:0,gf:0,seed:seedLookup.get(t)??999});const parts=gameScoreParts(g),ws=parts.white.regulation,ds=parts.dark.regulation,w=table.get(g.whiteTeam),d=table.get(g.darkTeam);w.gf+=ws;w.gd+=ws-ds;d.gf+=ds;d.gd+=ds-ws;(scoreOutcome(g)==='white'?w:d).wins++}
  return[...table.values()].sort((a,b)=>b.wins-a.wins||b.gd-a.gd||b.gf-a.gf||a.seed-b.seed||a.team.localeCompare(b.team)).map(x=>x.team)
}
function resolveTournament(){
  const games=DATA.games.map(g=>({...g,whiteTeam:smartTeam(g.whiteRaw),darkTeam:smartTeam(g.darkRaw)})),map=new Map(games.map(g=>[g.game,g])),slots=new Map(),groupPlacements=new Map(),poolPlacements=new Map();
  const seedLookup=new Map();for(const g of games){for(const raw of [g.whiteRaw,g.darkRaw]){const info=seedInfo(raw);if(info)seedLookup.set(info.team,info.seed)}}
  let changed=true,guard=0;
  while(changed&&guard++<50){changed=false;
    for(const g of games){for(const side of ['white','dark']){const key=`${side}Team`,raw=g[`${side}Raw`];if(g[key])continue;const wl=parseWL(raw);if(wl){const src=map.get(wl.game),o=outcome(src);if(o){g[key]=wl.kind==='W'?o.winner:o.loser;changed=true;continue}}const slot=parsePoolSlot(raw);if(slot&&slots.has(slot.key)){g[key]=slots.get(slot.key);changed=true;continue}const pp=parsePoolPlacement(raw);if(pp&&poolPlacements.has(`${pp.key}:${pp.rank}`)){g[key]=poolPlacements.get(`${pp.key}:${pp.rank}`);changed=true;continue}const gp=parseGroupPlacement(raw);if(gp&&groupPlacements.has(`${gp.key}:${gp.rank}`)){g[key]=groupPlacements.get(`${gp.key}:${gp.rank}`);changed=true}}}
    for(const g of games){const o=outcome(g);if(!o)continue;for(const [dest,teamName] of [[g.winnerTo,o.winner],[g.loserTo,o.loser]]){const slot=parsePoolSlot(dest);if(slot&&!slots.has(slot.key)){slots.set(slot.key,teamName);changed=true}}}
    const groups=new Map();for(const g of games){const wi=seedInfo(g.whiteRaw),di=seedInfo(g.darkRaw);if(!wi||!di||!wi.group||wi.group!==di.group)continue;const key=wi.group;if(!groups.has(key))groups.set(key,{games:[],teams:new Set()});groups.get(key).games.push(g);groups.get(key).teams.add(wi.team);groups.get(key).teams.add(di.team)}
    for(const [group,bucket] of groups){if(!bucket.games.length||!bucket.games.every(isFinal))continue;const ranked=rankTable([...bucket.teams],bucket.games,seedLookup);ranked.slice(0,3).forEach((teamName,i)=>{const key=`${group}:${i+1}`;if(!groupPlacements.has(key)){groupPlacements.set(key,teamName);changed=true}})}
    const pools=new Map();for(const g of games){const w=parsePoolSlot(g.whiteRaw),d=parsePoolSlot(g.darkRaw);if(!w||!d||w.track!==d.track||w.pool!==d.pool)continue;const key=`${w.track}_${w.pool}`;if(!pools.has(key))pools.set(key,{games:[],teams:new Set()});pools.get(key).games.push(g);if(g.whiteTeam)pools.get(key).teams.add(g.whiteTeam);if(g.darkTeam)pools.get(key).teams.add(g.darkTeam)}
    for(const [key,bucket] of pools){if(!bucket.games.length||!bucket.games.every(isFinal))continue;const ranked=rankTable([...bucket.teams],bucket.games,seedLookup);ranked.slice(0,3).forEach((teamName,i)=>{const placementKey=`${key}:${i+1}`;if(!poolPlacements.has(placementKey)){poolPlacements.set(placementKey,teamName);changed=true}})}
  }
  const teamGames=new Map();for(const g of games){for(const teamName of [g.whiteTeam,g.darkTeam]){if(!teamName)continue;if(!teamGames.has(teamName))teamGames.set(teamName,[]);teamGames.get(teamName).push(g)}}for(const list of teamGames.values())list.sort(gameSort);return{games,map,slots,placements:new Map([...groupPlacements,...poolPlacements]),seedLookup,teamGames,journeyCache:new Map()}
}
function display(g,side){return g?.[`${side}Team`]||slotLabel(g?.[`${side}Raw`])}
function seedForTeam(name){const seed=RESOLVED?.seedLookup?.get(name);return Number.isInteger(seed)&&seed>0&&seed<999?seed:null}
function seedBadgeHtml(name,context=''){const seed=seedForTeam(name);return seed?`<span class="jo-seed-badge${context==='dark'?' on-dark':''}" aria-label="JO division seed ${seed}" title="JO division seed ${seed}">#${seed}</span>`:''}
function teamLabelHtml(name,context=''){const label=String(name||'TBD');return`<span class="jo-team-label"${identityAttributes(label)}>${seedBadgeHtml(label,context)}<span class="jo-team-name">${esc(label)}</span></span>`}
function participantHtml(g,side,context=''){const known=g?.[`${side}Team`];return known?teamLabelHtml(known,context):`<span class="jo-team-label unresolved"><span class="jo-team-name">${esc(slotLabel(g?.[`${side}Raw`]))}</span></span>`}
function matchupHtml(g,context=''){const final=isFinal(g);return`<div class="jo-matchup${final?' is-final':''}${context==='dark'?' on-dark':''}"><div class="jo-match-participant">${participantHtml(g,'white',context)}</div><div class="jo-match-center">${final?`<span class="score">${esc(scoreDisplay(g))}</span>`:'<span class="jo-versus">vs</span>'}</div><div class="jo-match-participant">${participantHtml(g,'dark',context)}</div></div>`}
function candidateLabelsHtml(names,context=''){const uniqueNames=[...new Set((names||[]).filter(Boolean))];if(!uniqueNames.length)return'<span class="jo-team-label unresolved"><span class="jo-team-name">TBD</span></span>';return`<span class="jo-candidate-list">${uniqueNames.map(name=>teamLabelHtml(name,context)).join('<span class="jo-or">or</span>')}</span>`}
function namedMatchupHtml(name,opponent,candidates=[],context='dark'){const right=opponent?teamLabelHtml(opponent,context):candidateLabelsHtml(candidates,context);return`<div class="jo-next-matchup">${teamLabelHtml(name,context)}<span class="jo-match-separator">vs</span>${right}</div>`}
function teamOptionLabel(name){const seed=seedForTeam(name);return seed?`${name} — JO seed #${seed}`:name}

function friendlyStage(game){
  const config=currentConfig();
  const detail=String(game?.stageDetail||'').trim();
  const raw=String(game?.type||'').trim();
  const match=detail.match(/^([a-z]{2,3})[_-](.+)$/i);
  const code=match?match[1].toLowerCase():'';
  let round=(match?match[2]:raw||detail).replace(/_/g,' ').trim();
  const classic=/classic|\(d2\)/i.test(String(config?.division||''));
  const bracket=classic?({ag:'Silver',bz:'Bronze'}[code]||''):'';
  round=round
    .replace(/\bsemi(?:finals?)?\b/ig,'Semifinal')
    .replace(/\bqtr\b|\bquarter(?:finals?)?\b/ig,'Quarterfinal')
    .replace(/\bplay[- ]?in\b/ig,'Play-in')
    .replace(/^group$/i,'Group play')
    .replace(/\bRR\b/g,'round robin');
  if(/^1st$/i.test(round))round='Championship game';
  else if(/^(\d+)(st|nd|rd|th)$/i.test(round))round=`${round} place game`;
  return [bracket?`${bracket} bracket`:'',round].filter(Boolean).join(' · ')||raw||detail;
}
function friendlyDate(raw){const labels={'18-Jul':'Saturday, July 18','19-Jul':'Sunday, July 19','20-Jul':'Monday, July 20','21-Jul':'Tuesday, July 21'};return labels[raw]||raw}
function timeValue(value){const m=String(value||'').match(/^(\d+):(\d+)\s*(AM|PM)$/i);if(!m)return 9999;let h=Number(m[1])%12;if(m[3].toUpperCase()==='PM')h+=12;return h*60+Number(m[2])}
function dateValue(raw){const m=String(raw||'').match(/^(\d{1,2})-([A-Za-z]{3})$/);if(!m)return 999;const months={Jan:1,Feb:2,Mar:3,Apr:4,May:5,Jun:6,Jul:7,Aug:8,Sep:9,Oct:10,Nov:11,Dec:12};return(months[m[2]]||99)*100+Number(m[1])}
function gameSort(a,b){return dateValue(a.date)-dateValue(b.date)||timeValue(a.time)-timeValue(b.time)||a.game-b.game}
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
function targetGame(destination){return /^\d+$/.test(String(destination||''))?RESOLVED.map.get(Number(destination)):null}
function sourceCandidates(raw){const ref=parseWL(raw);if(!ref)return[];const source=RESOLVED.map.get(ref.game);return source?[source.whiteTeam,source.darkTeam].filter(Boolean):[]}
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
function destinationDescription(value){if(/^\d+$/.test(String(value||''))){const g=targetGame(value);return g?{title:`Game ${g.game}`,detail:`${friendlyDate(g.date)} · ${g.time} · ${g.location}`}:{title:`Game ${value}`,detail:'Schedule details unavailable'}}const slot=parsePoolSlot(value);if(slot)return{title:slotLabel(value),detail:'Pool games will appear automatically after this result is posted.'};return value&&!['RR','bracket'].includes(String(value).toLowerCase())?{title:slotLabel(value),detail:'The next scheduled game will appear when the bracket resolves.'}:null}


function mergeVerifiedSchedule(primaryGames,referenceGames=[]){
  const refsByGmid=new Map(),refsByGame=new Map();
  for(const ref of referenceGames||[]){if(ref?.gmid)refsByGmid.set(String(ref.gmid),ref);if(ref?.game!=null)refsByGame.set(String(ref.game),ref)}
  const merged=(primaryGames||[]).map(game=>{const reference=refsByGmid.get(String(game?.gmid||''))||refsByGame.get(String(game?.game??''));if(!reference)return{...game};const next={...game};for(const field of ['winnerTo','loserTo','whiteRaw','darkRaw','date','time','type','stageDetail','location','gmid']){if(String(next[field]??'').trim()===''&&String(reference[field]??'').trim()!=='')next[field]=field==='winnerTo'||field==='loserTo'?normalizeDestination(reference[field]):reference[field]}return next});
  const byGame=new Map(merged.map(game=>[String(game.game),game]));
  for(const target of merged){for(const raw of [target.whiteRaw,target.darkRaw]){const ref=parseWL(raw);if(!ref)continue;const source=byGame.get(String(ref.game));if(!source)continue;const field=ref.kind==='W'?'winnerTo':'loserTo';if(String(source[field]??'').trim()==='')source[field]=String(target.game)}}
  return merged
}
function datasetWithVerifiedRoutes(config,games,teams,referenceDataset){const merged=mergeVerifiedSchedule(games,referenceDataset?.games||[]);return{age:config.age,division:config.division,teams:Array.isArray(teams)&&teams.length?teams:teamsFromGames(merged),games:merged}}

const initialParams=new URLSearchParams(window.location.search);
let pendingTeam=initialParams.get('team')||'';
let pendingDivision=initialParams.get('division')||'';
let pendingAge=initialParams.get('age')||'';
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
  fullSchedule.innerHTML=list.length?list.map(g=>`<article class="game glass ${isFinal(g)?'completed':''}"><div class="top"><span>Game ${g.game}${isFinal(g)?' · FINAL':''}</span><span>${esc(friendlyDate(g.date))} · ${esc(g.time)}</span></div><div class="match">${matchupHtml(g)}</div><div class="journey-meta">${esc(g.location)} · ${esc(friendlyStage(g))} · ${esc(g.gmid)}</div></article>`).join(''):'<div class="empty glass">No games match the current full-schedule filters.</div>';
}

function setEmptyState(){const empty=$('emptyState');if(empty)empty.classList.toggle('hidden',!!team.value)}
function populateAges(){const selected=pendingAge||localStorage.getItem('joAgeV5')||'14U',ages=[...new Set(DATASETS.map(d=>d.age))];age.innerHTML=ages.map(x=>`<option value="${esc(x)}">${esc(x)}</option>`).join('');age.value=ages.includes(selected)?selected:ages[0];populateDivisions();applyInitialSelection()}
function populateDivisions(preferred){const choices=DATASETS.filter(d=>d.age===age.value),saved=preferred||localStorage.getItem(`joDivisionV5:${age.value}`);division.innerHTML=choices.map(d=>`<option value="${esc(d.id)}">${esc(d.division)}</option>`).join('');division.value=choices.some(d=>d.id===saved)?saved:choices[0]?.id||''}
function populateTeamAndDay(){const config=currentConfig(),saved=config?localStorage.getItem(`joSelectedTeam:${config.id}`)||'':'';team.innerHTML='<option value="">Choose your team</option>'+DATA.teams.map(t=>`<option value="${esc(t)}">${esc(teamOptionLabel(t))}</option>`).join('');const target=pendingTeam||saved;if(DATA.teams.includes(target))team.value=target;pendingTeam='';const previous=day.value;day.innerHTML='<option value="">All days</option>'+[...new Set(DATA.games.map(g=>g.date))].sort((a,b)=>dateValue(a)-dateValue(b)).map(d=>`<option value="${esc(d)}">${esc(friendlyDate(d))}</option>`).join('');if([...day.options].some(o=>o.value===previous))day.value=previous;populateFullDay();}

function renderPaths(upcoming){const win=destinationDescription(upcoming.winnerTo),loss=destinationDescription(upcoming.loserTo);$('pathSection').classList.toggle('hidden',!win&&!loss);paths.innerHTML=[['win','If they win',win],['loss','If they lose',loss]].filter(x=>x[2]).map(([cls,label,d])=>`<article class="path-card ${cls} glass"><h3>${label}</h3><div class="path-destination">${esc(d.title)}</div><div class="path-detail">${esc(d.detail)}</div></article>`).join('')}
function statusText(games,upcoming){if(!games.length)return'No games found';if(!games.some(isFinal))return'Tournament not started';if(upcoming&&/5th/i.test(upcoming.type))return'Playing for 5th/6th';if(upcoming&&/3rd/i.test(upcoming.type))return'Playing for 3rd/4th';if(upcoming&&/1st|champ/i.test(upcoming.type))return'Playing for the championship';if(upcoming)return'Still alive';return'Tournament complete'}
function renderTeam(){const name=team.value,config=currentConfig();if(!name){$('teamView').classList.add('hidden');setEmptyState();updateShareUrl();return}$('teamView').classList.remove('hidden');setEmptyState();updateShareUrl();if(config)localStorage.setItem(`joSelectedTeam:${config.id}`,name);const games=gamesForTeam(name),completed=games.filter(isFinal),upcoming=games.find(g=>!isFinal(g));const wins=completed.filter(g=>resultFor(g,name)==='win').length,losses=completed.length-wins,seed=seedForTeam(name);summary.innerHTML=`<div class="eyebrow">Selected team</div><div class="jo-summary-title"><h2>${esc(name)}</h2>${seed?`<span class="jo-seed-summary">JO seed #${seed}</span>`:''}</div><div class="stats"><div class="stat"><small>Record</small>${completed.length?`${wins}-${losses}`:'—'}</div><div class="stat"><small>Games played</small>${completed.length}</div><div class="stat"><small>Status</small>${esc(statusText(games,upcoming))}</div></div>`;if(upcoming){const opp=otherTeam(upcoming,name),candidates=gameCandidates(upcoming,name);next.innerHTML=`<div class="next-label">Next game</div>${namedMatchupHtml(name,opp,candidates,'light')}<div>${esc(friendlyDate(upcoming.date))} · ${esc(upcoming.time)}</div><div class="journey-meta">${esc(upcoming.location)} · Game ${upcoming.game} · ${esc(friendlyStage(upcoming))}</div>`;renderPaths(upcoming)}else{next.innerHTML='<div class="next-label">Tournament status</div><div class="next-match">No upcoming game</div>';renderPaths({winnerTo:'',loserTo:''})}const grouped={};games.forEach(g=>(grouped[g.date]??=[]).push(g));journey.innerHTML=games.length?'<div class="journey">'+Object.entries(grouped).map(([date,list])=>`<section class="day"><h3>${esc(friendlyDate(date))}</h3>${list.map(g=>{const r=resultFor(g,name)||'upcoming';return`<article class="journey-card glass ${r}"><div class="journey-time">Game ${g.game}<br>${esc(g.time)}</div><div><div class="journey-score">${matchupHtml(g)}</div><div class="journey-meta">${esc(g.location)} · ${esc(friendlyStage(g))}</div></div><span class="pill ${r}">${r==='win'?'Win':r==='loss'?'Loss':'Upcoming'}</span></article>`}).join('')}</section>`).join('')+'</div>':'<div class="empty glass">No resolved games are currently available for this team.</div>';renderRelevant();renderPotential(name,upcoming)}

function relevantIds(name,upcoming){const ids=new Set(gamesForTeam(name).map(g=>g.game));if(!upcoming)return ids;for(const raw of [upcoming.whiteRaw,upcoming.darkRaw]){const ref=parseWL(raw);if(ref)ids.add(ref.game)}for(const dest of [upcoming.winnerTo,upcoming.loserTo]){const target=targetGame(dest);if(!target)continue;ids.add(target.game);for(const raw of [target.whiteRaw,target.darkRaw]){const ref=parseWL(raw);if(ref)ids.add(ref.game)}}return ids}
function renderRelevant(){const name=team.value,q=String(search.value||'').trim().toLowerCase(),selectedDay=day.value,games=gamesForTeam(name),upcoming=games.find(g=>!isFinal(g)),ids=relevantIds(name,upcoming);let list=RESOLVED.games.filter(g=>g.whiteTeam||g.darkTeam);if(!q)list=list.filter(g=>ids.has(g.game));list=list.filter(g=>(!selectedDay||g.date===selectedDay)&&(!q||[display(g,'white'),display(g,'dark'),g.location,g.type,g.gmid,g.game].join(' ').toLowerCase().includes(q))).sort(gameSort);schedule.innerHTML=list.length?list.map(g=>`<article class="game glass ${isFinal(g)?'completed':''}"><div class="top"><span>Game ${g.game}${isFinal(g)?' · FINAL':''}</span><span>${esc(friendlyDate(g.date))} · ${esc(g.time)}</span></div><div class="match">${matchupHtml(g)}</div><div class="journey-meta">${esc(g.location)} · ${esc(friendlyStage(g))}</div></article>`).join(''):'<div class="empty glass">No games match the current filters.</div>'}

function renderPotential(name,upcoming){const paths=projectedOpponentPaths(name,upcoming);potential.innerHTML=paths.length?paths.slice(0,12).map(item=>{const meta=`${item.route} · Game ${item.game.game} · ${friendlyDate(item.game.date)} ${item.game.time}`;return item.candidate&&DATA.teams.includes(item.candidate)?`<button data-team="${esc(item.candidate)}"><div class="jo-potential-team">${teamLabelHtml(item.candidate)}</div><div class="journey-meta">${esc(meta)}</div></button>`:`<div class="jo-potential-placeholder"><div class="jo-potential-team">${esc(item.label)}</div><div class="journey-meta">${esc(meta)}</div></div>`}).join(''):'<div class="empty glass">No additional future opponents are currently identifiable.</div>';potential.querySelectorAll('[data-team]').forEach(button=>button.addEventListener('click',()=>{team.value=button.dataset.team;renderTeam();window.scrollTo({top:0,behavior:'smooth'})}))}

function rebuild(){RESOLVED=resolveTournament();populateTeamAndDay();renderFullSchedule();const config=currentConfig();setText('metricTeamCount',DATA.teams.length||'—');if(config){setText('activeDivisionTitle',`${config.age} ${config.division}`);setText('activeDivisionMeta',`${DATA.teams.length} teams · ${DATA.games.length} published games`);}if(team.value)renderTeam();else{$('teamView').classList.add('hidden');setEmptyState();updateShareUrl();}}
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
function renderSourceMeta(config,mode,games,updatedAt,detail=''){const root=$('sourceMeta');const completed=(games||[]).filter(isFinal).length,scheduled=Math.max(0,(games||[]).length-completed);updateOverviewMetrics(config,games,updatedAt,mode);if(!root)return;root.innerHTML=`<div><span>Source</span><strong>Official Google Sheet</strong></div><div><span>Last successful update</span><strong>${esc(sourceTimestamp(updatedAt))}</strong></div><div><span>Schedule</span><strong>${scheduled} scheduled · ${completed} completed</strong></div><div><span>Mode</span><strong>${esc(mode)}</strong></div>${detail?`<p>${esc(detail)}</p>`:''}`;}
async function loadCurrent(manual=false){
  const config=currentConfig();if(!config)return;
  lastLoadAttemptAt=Date.now();
  const version=++loadVersion,status=$('statusText'),dot=$('liveDot'),button=$('refresh');
  const cached=readCache(config),embedded=EMBEDDED_FALLBACKS[config.id]?structuredClone(EMBEDDED_FALLBACKS[config.id]):null;
  const immediate=cached?datasetWithVerifiedRoutes(config,cached.games,cached.teams,embedded):embedded;
  button.disabled=true;
  if(immediate){
    DATA=immediate;
    dot.classList.add('fallback');
    status.textContent=`${cached?'Last verified':'Verified'} ${config.age} ${config.division} schedule loaded · checking live Google Sheet…`;
    renderSourceMeta(config,cached?'Last verified cache · checking live':'Verified schedule · checking live',immediate.games,cached?.cachedAt||null,'A verified schedule is available immediately while CPI checks for newer Google Sheet data.');
    rebuild();team.disabled=false;
  }else{
    team.disabled=true;
    status.textContent=manual?`Refreshing ${config.division}…`:`Loading ${config.age} ${config.division}…`;
    renderSourceMeta(config,'Checking live source',[],null);
  }
  try{
    const loaded=await fetchDataset(config);if(version!==loadVersion)return;
    const refreshedAt=new Date().toISOString();
    DATA=datasetWithVerifiedRoutes(config,loaded.games,loaded.teams,embedded);
    writeCache(config,DATA);
    dot.classList.remove('fallback');
    status.textContent=`Live from Google Sheets · ${config.age} ${config.division} · ${DATA.games.length} games · ${loaded.method||'live'} · refreshed ${new Date(refreshedAt).toLocaleTimeString([],{hour:'numeric',minute:'2-digit'})}`;
    renderSourceMeta(config,'Live browser refresh',DATA.games,refreshedAt,'Live results are merged with verified bracket-routing metadata so downstream games remain visible.');
  }catch(error){
    if(version!==loadVersion)return;
    const fallbackCache=readCache(config),fallbackEmbedded=embedded;
    if(fallbackCache){
      DATA=datasetWithVerifiedRoutes(config,fallbackCache.games,fallbackCache.teams,fallbackEmbedded);
      dot.classList.add('fallback');
      status.textContent=`Using last successful ${config.age} ${config.division} update · live sheet unavailable (${error.message})`;
      renderSourceMeta(config,'Last verified browser cache',DATA.games,fallbackCache.cachedAt,'The live sheet could not be read, so CPI preserved the last successful schedule.');
    }else if(fallbackEmbedded){
      DATA=structuredClone(fallbackEmbedded);
      dot.classList.add('fallback');
      status.textContent=`Using embedded ${config.age} ${config.division} schedule · live sheet unavailable (${error.message})`;
      renderSourceMeta(config,'Embedded fallback',DATA.games,null,'Confirm changes with the official division sheet.');
    }else{
      DATA={age:config.age,division:config.division,teams:[],games:[]};
      dot.classList.add('fallback');
      status.textContent=`Could not load ${config.age} ${config.division} (${error.message})`;
      renderSourceMeta(config,'Unavailable',[],null,'No verified schedule is currently available in this browser.');
    }
  }finally{
    if(version===loadVersion){rebuild();button.disabled=false;team.disabled=false}
  }
}
function selectDataset(){const config=currentConfig();if(!config)return;updateSheetLink();localStorage.setItem('joAgeV5',config.age);localStorage.setItem(`joDivisionV5:${config.age}`,config.id);search.value='';day.value='';loadCurrent(false)}
age.addEventListener('change',()=>{localStorage.setItem('joAgeV5',age.value);populateDivisions();selectDataset()});division.addEventListener('change',selectDataset);team.addEventListener('change',renderTeam);search.addEventListener('input',renderRelevant);day.addEventListener('change',renderRelevant);$('journeyTab').addEventListener('click',()=>{$('journeyTab').classList.add('active');$('relevantTab').classList.remove('active');journey.classList.remove('hidden');$('relevant').classList.add('hidden')});$('relevantTab').addEventListener('click',()=>{$('relevantTab').classList.add('active');$('journeyTab').classList.remove('active');journey.classList.add('hidden');$('relevant').classList.remove('hidden')});$('refresh').addEventListener('click',()=>loadCurrent(true));
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
document.addEventListener('visibilitychange',()=>{if(!document.hidden)refreshWhenActive()});

