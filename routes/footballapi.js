/**Node Packages and Global Object - Declaration / Instantiation */

let express                    = require('express');
let router                     = express.Router();
let request                    = require('request');
let config                     = require('../configuration/config');
let sqlInstance                = require('mssql');
let db                         = require('../configuration/db');
const pool                     = new sqlInstance.ConnectionPool(config)
let customVisualizationDataSQL = `SELECT  s.comp_group , e.type , count(e.type) 'Total'
                                  FROM dbo.events e , dbo.football_teams t, dbo.standings s
                                  WHERE e.teamid = t.id
                                  AND t.id = s.team_id
                                  GROUP BY s.comp_group,e.type
                                  ORDER BY 1`;
let seriesFormat =  [['Group', 'Reds','Yellow Reds','Yellows','Goals'], 
                    ['A',0, 0,4,6], 
                    ['B',0, 0,4,5], 
                    ['C',0, 0,3,5], 
                    ['D',0, 0,6,3], 
                    ['E',0, 0,7,2], 
                    ['F',0, 0,2,3], 
                    ['G',0, 0,0,0],
                    ['H',0, 0,0,0]];
//Check for Errors
pool.connect(err => {
})

/**
 * 
 * GLOBAL ROUTE for footballapi.js
 * http://localhost:8010/extract/footballapi/ . . .
 */

 
 /** Methods */
 function transformSeries(series) {

    switch(series.comp_group){
        case 'Group A':
        console.log("GroupA!")
        switch(series.type){
            case 'red':
            seriesFormat[1][1] = series.Total;
            break;
            case 'yellowred':
            seriesFormat[1][2] = series.Total;
            break;
            case 'yellowcard':
            seriesFormat[1][3] = series.Total;
            break;
            case 'goal':
            console.log('Setting Goals');

            console.log("Series Format before" + seriesFormat[1][4]);
            seriesFormat[1][4] = series.Total;
            console.log("Series Format after" + seriesFormat[1][4]);

            break;
        }
        break;
        case 'Group B':
        switch(series.type){
            case 'red':
            seriesFormat[2][1] = series.Total;
            break;
            case 'yellowred':
            seriesFormat[2][2] = series.Total;
            break;
            case 'yellowcard':
            seriesFormat[2][3] = series.Total;
            break;
            case 'goal':
            seriesFormat[2][4] = series.Total;
            break;
        }
        break;
        case 'Group C':
        switch(series.type){
            case 'red':
            seriesFormat[3][1] = series.Total;
            break;
            case 'yellowred':
            seriesFormat[3][2] = series.Total;
            break;
            case 'yellowcard':
            seriesFormat[3][3] = series.Total;
            break;
            case 'goal':
            seriesFormat[3][4] = series.Total;
            break;
        }
        break;
        case 'Group D':
        switch(series.type){
            case 'red':
            seriesFormat[4][1] = series.Total;
            break;
            case 'yellowred':
            seriesFormat[4][2] = series.Total;
            break;
            case 'yellowcard':
            seriesFormat[4][3] = series.Total;
            break;
            case 'goal':
            seriesFormat[4][4] = series.Total;
            break;
        }
        break;
        case 'Group E':
        switch(series.type){
            case 'red':
            seriesFormat[5][1] = series.Total;
            break;
            case 'yellowred':
            seriesFormat[5][2] = series.Total;
            break;
            case 'yellowcard':
            seriesFormat[5][3] = series.Total;
            break;
            case 'goal':
            seriesFormat[5][4] = series.Total;
            break;
        }
        break;
        case 'Group F':
        switch(series.type){
            case 'red':
            seriesFormat[6][1] = series.Total;
            break;
            case 'yellowred':
            seriesFormat[6][2] = series.Total;
            break;
            case 'yellowcard':
            seriesFormat[6][3] = series.Total;
            break;
            case 'goal':
            seriesFormat[6][4] = series.Total;
            break;
        }
        break;
        case 'Group G':
        switch(series.type){
            case 'red':
            seriesFormat[7][1] = series.Total;
            break;
            case 'yellowred':
            seriesFormat[7][2] = series.Total;
            break;
            case 'yellowcard':
            seriesFormat[7][3] = series.Total;
            break;
            case 'goal':
            seriesFormat[7][4] = series.Total;
            break;
        }
        break;
        case 'Group H':
        switch(series.type){
            case 'red':
            seriesFormat[8][1] = series.Total;
            break;
            case 'yellowred':
            seriesFormat[8][2] = series.Total;
            break;
            case 'yellowcard':
            seriesFormat[8][3] = series.Total;
            break;
            case 'goal':
            seriesFormat[8][4] = series.Total;
            break;
        }
        break;
    }
 }
function executeQuery(query,res,type = 1) {

    const request = new sqlInstance.Request(pool)
    request.query(query, function (err, result) {
        if (err) {
            console.log(err);
            throw err;
        }

        data = result.recordset;
        if(type!=1){
            // console.log(data);
            let seriesData = data;
            seriesData.forEach(series => {

               transformSeries(series);
            });
            res.send(seriesFormat);
        }
        else{
            res.send( result);
        }
    }); 
}

// localhost/extract/footballapi/
// Default FootBALL API REQUESTS FOR DATA
router.use((req, res, next) => {

    console.log("Welcome to the Extra/Footballapi Route");

    next();
});

// POST:  Standings
router.post('/standings', (req, res, next) => {

    let date = new Date();
    console.log('Recieved a post for Standings, listing content: '+ date.toLocaleTimeString() );
    console.log(req.body.length);
    // console.log(sqlInstance);
    let Standings = req.body;
    let StandingUpdateSql = "";
    for (let i = 0; i < Standings.length; i++) {

        let standing = Standings[i];
        StandingUpdateSql += `Update dbo.standings
        set position = ${standing.position},overall_gp =  ${standing.overall_gp},
        overall_w = ${standing.overall_w},overall_gs  = ${standing.overall_gs},
        points =  ${standing.points},overall_l = ${standing.overall_l}
        where team_name like  '%${standing.team_name}%'; `
    }
    // res.send(StandingUpdateSql);
    //  responseSql += StandingUpdateSql;

     executeQuery(StandingUpdateSql,res);

    /** Method One 
     sqlInstance.connect(config, err => {
        if (err) console.log(err);
        console.log('Connected!');
        let request = new sqlInstance.Request();
        request.query(StandingUpdateSql, function (err, recordset) {
            if (err) console.log(err)
            res.status(200).send({ Success: "Sucess",Query: StandingUpdateSql, Data: recordset });
        });
        sqlInstance.close();
        });
   */
});
//POST:  Squads
router.post('/Teams', (req, res, next) => {

    let SquadInsertSql = "";
    let SquadUpdateSql = "";
    let Teams = req.body;
    console.log('We received Teams Data:');
    console.log(Teams.length);

    // For Each of the Teams
    for (let i = 0; i < Teams.length; i++) {

        let team = Teams[i];
        console.log(team)
        // And each squad of that team
        for (let j = 0; j < team.squad.length; j++) {

            let player = Teams[i].squad[j];
            player.teamId = Teams[i].team_id;
            player.number = (player.number == '') ? 0 : player.number;
            player.injured = (player.injured == "False") ? 0 : 1;
            player.name = player.name.replace("'", "");
            SquadInsertSql += `
            Insert into dbo.squads 
            Values(${player.id},'${player.name}',${player.number},'${player.position}',
            ${player.injured},${player.minutes},${player.lineups},${player.appearences},
            ${player.goals},${player.assists},${player.yellowcards},${player.yellowred},${player.redcards},${player.teamId}); `
            SquadUpdateSql += `
            Update dbo.squads set 
            injured = ${player.injured}, minutes = ${player.minutes},
            lineups = ${player.lineups}, appearances = ${player.appearences},
            goals = ${player.goals}, assists = ${player.assists},
            yellowcards = ${player.yellowcards}, yellowreds = ${player.yellowred},
            redcards =${player.redcards} where id = ${player.id}; `
        }
    }

    executeQuery(SquadUpdateSql,res);
    
});

// POST: Matches
router.post('/matches', (req, res, next) => {

    let Matches = req.body;
    let MatchUpdateSql = "";
    let EventInsertSql = "Delete from dbo.events;";
    let MatchInsertSql = "Delete from dbo.football_matches; ";
    let sqlStatement = "";

    console.log('We recieved Match Data: ');
    console.log(Matches.length);
    Matches.forEach(match => {


        ///format date
        let formattedDate = match.formatted_date.split('.')[2] +
            "-" + match.formatted_date.split('.')[1] + "-" +
            match.formatted_date.split('.')[0];
        ///format ht and full time score [0-0] = 
        let matchId = match.id;
        let timer, status = "";
        let homeScore, awayScore = 0;
        let city = match.venue_city;
        if (city == "Kazan'") {
            city = 'Kazan'
        }
        //  check for null
        if (match.timer == '') {
            // console.log('Time is null');
            timer = "Not Started";
            status = "Not Started";
            homeScore = 0;
            awayScore = 0;
        } else {
            timer = match.timer;
            status = match.status;

        }
         if(match.localteam_score == "?"){
             console.log('Found it');
             match.localteam_score = 0;
             console.log(match.localteam_score);
         }
         if(match.visitorteam_score == "?"){
            console.log('Found it');
            match.visitorteam_score = 0;
            console.log(match.visitorteam_score)
        }


        MatchInsertSql += ` Insert into dbo.football_matches (apiMatchID, competitionID,dateOfMatch, 
            season,venue,status,time , homeTeamID,awayteamid,homescore,awayscore) Values 
            (${match.id}, ${match.comp_id}, '${formattedDate}', '${match.season}' ,
            '${match.venue_id}', '${match.status}', '${match.time}', ${match.localteam_id},
            ${match.visitorteam_id}, ${match.localteam_score}, ${match.visitorteam_score});`;
        MatchUpdateSql += `Update dbo.football_matches set status = '${match.status}', time =  '${match.time}', homeTeamId = ${match.localteam_id},
            awayTeamId = ${match.visitorteam_id}, homeScore = ${match.localteam_score}, 
            awayScore = ${match.visitorteam_score} where apiMatchId = ${match.id};`
            match.events.forEach(event => {
                switch (event.team) {
                    case 'localteam':
                        teamID = match.localteam_id;
                        break;
                    case 'visitorteam':
                        teamID = match.visitorteam_id;
                        break;
                    default:
                        break;
                }

                event.player = event.player.replace("'", "");
                if(event.player == ''){
                    event.player = 'null'
                }
             
                if(event.player_id!=''){
                    EventInsertSql +=
                    `Insert into dbo.events (matchid,teamid,playerId, playername,type)` +
                    `Values (${match.id},${teamID},${event.player_id},'${event.player}','${event.type}'); `;
                }
                else {
                    EventInsertSql +=
                    `Insert into dbo.events (matchid,teamid,playername,type)` +
                    `Values (${match.id},${teamID},'${event.player}','${event.type}'); `;
                }
                
                // sqlUpdateStatement += 
                // `
                // Update  dbo.events  set matchid = ${match.id},teamid = ${teamID},type = '${event.type}' where id =${event.id};`;
            });
    })//End For Each 
    sqlStatement = MatchInsertSql + EventInsertSql;
//    res.send({query: sqlStatement});
    executeQuery(sqlStatement,res);
    
});

router.get('/viz',(req,res,next)=>{

    executeQuery(customVisualizationDataSQL,res,3);
    // data needs to be in this format
    //
});
module.exports = router;





