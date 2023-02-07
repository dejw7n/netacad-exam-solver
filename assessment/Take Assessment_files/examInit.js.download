// ################################################################
// Variables used in Div Initialization
// ################################################################
Question = new Array();
Question.index = 0;
prev_name = new Array(); // Array to hold previously answered response names
prev_value = new Array(); // Array to hold previously answered response values
submitted = false; // Flag to hold status of main form.  Checked to prevent multiple submissions.

// ################################################################
// Definition of Question Object
// ################################################################
function QuestionObj(type,id,respid,numresp,display,groupid){
     // browser generic properties
	this.id = id;
    this.groupid = groupid || id;
	if (display==null) display = "html";
    this.display = display; // Added to accomodate alternate display types like svg, dropdown, flash
	this.type = type; // type = "MCSA", "MCMA", "FIB", "SSI", "SST", etc
	this.response_id = respid; // holds response id passed back to server
	this.response_labels = new Array(numresp+1); // holds object labels for DND
    this.response_array = new Array(numresp+1); // holds response for Self-scored items
    for (var i=1; i<= numresp; i++)
    {
        this.response_labels[i] = "";
        this.response_array[i] = "";
    }
	this.numresp = numresp; // number of responses > 1 for MCMA, DND, PNC, SSI/SST?
	this.bottom = 0; // Question bottom y position used for Page Format
    this.objs = new Array();
	this.numobjs = 0;
    this.hots = new Array();
	this.numhots = 0;
    this.dots = new Array();
	this.numdots = 0; // s/b only 1 in v1.2
	this.clickCounter = 0; // needed to accomodate more than 1 PNC
    this.bases = new Array();
	this.numbases = 0; // s/b only 1?
    this.texts = new Array();
	this.numtexts = 0; // s/b only 1?
    this.controls = new Array();
	this.numcontrols = 0; // s/b only 1?
	/*
	 * added to support PT as media item
	 * mpollack 8-1-2012
	 */
	this.ptMediaGUID = new Array();  // array
    
    if(type == "DND")
    {
        this.drag = new DragObject(); // add drag object specific to question
        this.drag.ondragstart = dragStart;
        this.drag.ondragdrop = hitTarget;
        this.drag.ondragend = dragEnd;
        this.drag.ondragmove = dragMove;
    }
    
    Question[id] = this; // add reference in Question object to search by id
} // end Drag Question definition
// ################################################################

function setup(showAnswers) {
    allDivs = document.getElementsByTagName("div");
    var idRE = /^(PassageText|Text|Base|Obj|Hot|Controls|Dot)$/i;
    for (var i=0; i<allDivs.length; i++) {
        var aDiv = allDivs[i]; // a reference to the current layer/div
        if (aDiv.id != "") {
            // Regular Expression to match any keyword for the layer id
            var idType = aDiv.id.match(idRE);
            if (idType != null) {
                idType = idType.toString().toLowerCase(); // convert id Object to lowercase String
                var id = RegExp.leftContext;
                var questionRef = Question[id];
                if(idType == "passagetext") {
                    // special passage text set up
                }
                else if (idType == "text") {
                    questionRef.texts[questionRef.numtexts] = aDiv;
                    questionRef.numtexts++;
                }
                else if (idType == "base") {
                    aDiv.questionRef = questionRef;
                    questionRef.bases[questionRef.numbases] = aDiv;
                    questionRef.numbases++;
                }
                else if (idType == "obj") {
                    aDiv.questionRef = questionRef;
                    questionRef.objs[questionRef.numobjs] = aDiv;
                    if (questionRef.drag) {
                        questionRef.drag.add(aDiv);
                        aDiv.startx = aDiv.x;
                        aDiv.starty = aDiv.y;
                      //  alert("examInit startx: " + aDiv.style.top + " starty: " + aDiv.style.left);
                    }
                    questionRef.numobjs++;
                }
                else if (idType == "hot") {
                    aDiv.questionRef = questionRef;
                    questionRef.hots[questionRef.numhots] = aDiv;
                    if (questionRef.drag) {
                        questionRef.drag.addTarget(aDiv);
                        aDiv.occupied = false;
                        aDiv.occupyingObj = null;
                    }
                    questionRef.numhots++;
                }
                else if (idType == "controls") {
                    questionRef.controls[questionRef.numcontrols] = aDiv;
                    questionRef.numcontrols++;
                }
                else if (idType == "dot") {
                    questionRef.dots[questionRef.numdots] = aDiv;
                    questionRef.numdots++;
                }
            }
        }
    }
	// ################################################################
	// Check for previous answers (reposition to previous)
	reposition(showAnswers);
	// ################################################################
} // end setup() function
