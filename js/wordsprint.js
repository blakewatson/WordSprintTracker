function Novelist( name ) {
	this.name = name; // NaNoWriMo username
	this.wc = []; // For starting word count and subsequent sprints
	
	this.init = function() {
		this.wc[0] = this.getWordCount();
	};
	this.count = function() {
		var currentWC = this.getWordCount();
		var runningTotal = this.wc[0];
		var i;
		for( i=1; i<this.wc.length; i++ ) {
			runningTotal += this.wc[i];
		}
		this.wc.push( currentWC - runningTotal );
		return this.wc[ this.wc.length-1 ];
	};
	this.sessionTotal = function() {
		var runningTotal = 0;
		var i;
		for( i=1; i<this.wc.length; i++ ) {
			runningTotal += this.wc[i];
		}
		return runningTotal;
	};
	this.total = function() {
		var runningTotal = 0;
		var i;
		for( i=0; i<this.wc.length; i++ ) {
			runningTotal += this.wc[i];
		}
		return runningTotal;
	};
	this.getWordCount = function() {
		var name = this.name;
		var wc;
		$.ajax({
			type: "GET",
			url: "wc.php",
			data: { name:name },
			success: function( xml, status, jqXHR ) {
				var json = $.xml2json( xml );
				if( json.user_wordcount ) {
					wc = json.user_wordcount;
				}
			},
			async: false
		});
		return parseInt(wc);
	};
	this.html = function() {
		var output ='<td class="name">';
		output += this.name + ' <i class="icon-remove" data_user="';
		output += this.name + '"></i></td>'
		output += '<td class="wc">';
		output += this.sessionTotal();
		output += "</td>"
		output += '<td class="wc_total muted">(';
		output += this.total();
		output += " total)</td>";
		return output;
	};
}

function Sprint( duration ) {
	this.duration = duration; // duration of the sprint in minutes
	this.wc = 0; // total word count for the group during the sprint
	
	this.start = function() {
		var s = this;
		$(".time").html( padNum( parseInt( this.duration ) ) + ":00" );
		var seconds = parseInt( this.duration ) * 60;
		var timer = setInterval( function() {
			seconds--;
			var min = padNum( Math.floor( seconds/60 ) );
			var sec = padNum( seconds % 60 );
			$(".time").html( min + ":" + sec );
			if( seconds === 0 ) {
				clearInterval( timer );
				$(".overlay").addClass("red");
				$(".refresh").removeClass("hidden");
			}
			$(".cancel-sprint").unbind();
			$(".cancel-sprint").click( function() {
				s.cancel( timer );
			});
		}, parseInt( 1000 ) );
		app.showOverlay();
	};
	this.cancel = function( timer ) {
		clearInterval( timer );
		app.sprints.pop();
		app.hideOverlay();
	};
}

function WordSprintTracker() {
	this.novelists = []; // array of Novelist objects
	this.sprints = []; // array of Sprint objects
	this.wc = 0; // total word count of all sprints
	this.goal = 0;
	
	this.init = function() {
		this.setGoal( 0 );
	};
	this.newNovelist = function() {
		var num = this.novelists.length + 1;
		alertify.prompt( "Enter the novelist’s NaNoWriMo username:",
		function( e, name ) {
			if( e && name ) {
				var novelist = new Novelist( name );
				novelist.init();
				app.novelists.push( novelist );
				app.refreshNovelists( false );
				alertify.success( "Added " + novelist.name );
				app.setGoal( 0 );
			} else {
				// Do nothing
			}
		}, "blakewatson" );
	};
	this.deleteNovelist = function( name ) {
		var i;
		for( i=0; i<this.novelists.length; i++ ) {
			if( this.novelists[i].name === name ) {
				this.novelists.splice( i, 1 );
				break;
			}
		}
		$(".novelist."+name).remove();
		this.setGoal( 0 );
		this.refreshNovelists( true );
	};
	this.sortNovelists = function() {
		var counts = [];
		var temp = [];
		var i;
		for( i=0; i<this.novelists.length; i++ ) {
			counts[i] = this.novelists[i].sessionTotal();
		}
		
		counts.sort(function(a,b){return b - a});
		
		for( i=0; i<counts.length; i++ ) {
			var j;
			for( j=0; j<this.novelists.length; j++ ) {
				if( this.novelists[j].sessionTotal() === counts[i] ) {
					temp[i] = this.novelists[j];
					this.novelists.splice( j, 1);
					break;
				}
			}
		}
		
		this.novelists = temp;
	};
	this.refreshNovelists = function( sort ) {
		var i;
		var lastCount = -1;
		var rank = 0;
		var output = '<tr class="headings"><th>Rank</th><th>Name</th><th>Session Total</th><th>Novel Total</th></tr>';
		if( sort ) {
			this.sortNovelists();
		}
		for( i=0; i<this.novelists.length; i++ ) {
			if( this.novelists[i].wc[ this.novelists[i].wc.length-1 ] !== lastCount
				|| this.novelists[i].wc.length === 1 ) {
				rank++;
			}
			output += '<tr class="novelist ';
			output += this.novelists[i].name + '">';
			output += '<td class="rank">' + rank + "</td>";
			output += this.novelists[i].html();
			output += "</tr>";
			lastCount = this.novelists[i].wc[ this.novelists[i].wc.length-1 ];
		}
		$(".novelists .icon-remove").unbind();
		
		$(".novelists tbody").html( output );
		
		$(".novelists .icon-remove").click( function() {
			var name = $(this).attr( "data_user" );
			alertify.confirm("Are you sure you want to remove " + name + "?", function( e ) {
				if( e ) {
					app.deleteNovelist( name );
				}
			});
		});
	};
	this.newSprint = function() {
		alertify.prompt( "How many minutes?",
		function( e, duration ) {
			if( e ) {
				var sprint = new Sprint( duration );
				sprint.start();
				app.sprints.push( sprint );
			} else {
				// Do nothing
			}
		}, "15" );
	};
	this.finishSprint = function() {
		var sprintCount = this.getCounts();
		var length = this.sprints.length;
		var duration = this.sprints[ length-1 ].duration;
		this.sprints[ length-1 ].wc = sprintCount;
		this.wc += sprintCount;
		this.refreshNovelists( true );
		$(".sprints tbody").prepend( '<tr class="sprint"><td>' + length + "</td><td>Wrote <b>" + sprintCount + "</b> words in <b>" + duration + "</b> minutes</td></tr>" );
		this.setProgress();
		this.hideOverlay();
	};
	this.getCounts = function() {
		var runningTotal = 0;
		var i;
		for( i=0; i<this.novelists.length; i++ ) {
			var wc = this.novelists[i].count();
			runningTotal += wc;
		}
		return runningTotal;
	};
	this.setGoal = function( goal ) {
		if( goal > 0 ) {
			this.goal = goal;
		} else {
			var numNovelists = this.novelists.length;
			this.goal = numNovelists * 1667; 
		}
		this.setProgress();
	};
	this.setProgress = function() {
		var percent = (this.wc / this.goal) * 100;
		if( percent > 100 ) {
			percent = 100;
		}
		$(".twc").html( this.wc );
		$(".goal").html( this.goal );
		$(".progress .bar").css( "width", percent + "%" );
	};
	this.showOverlay = function() {
		$(".overlay").removeClass("red");
		$(".overlay").removeClass("hidden");
		$(".refresh").addClass("hidden");
	};
	this.hideOverlay = function() {
		$(".overlay").removeClass("red");
		$(".overlay").addClass("hidden");
		$(".refresh").addClass("hidden");
	};
}

var app;

$(document).ready( function() {
	app = new WordSprintTracker();
	app.init();
	
	$(".change-goal").click( function() {
		alertify.prompt( "New word goal:",
		function( e, goal ) {
			if( e && goal ) {
				app.setGoal( goal );
			} else {
				// Do nothing
			}
		}, app.goal );
	});
	
	$(".new-novelist").click( function() {
		app.newNovelist();
	});
	
	$(".new-sprint").click( function() {
		app.newSprint();
	});
	
	$(".refresh .btn").click( function() {
		app.finishSprint();
	});
});

function padNum(number) {
    var str = '' + number;
    while (str.length < 2) {
        str = '0' + str;
    }
    return str;
}