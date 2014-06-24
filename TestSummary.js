function DefectSummaryMatrix() {
	var defectData;
	var table;
	var total = "Total";
	var rallyDataSource = new rally.sdk.data.RallyDataSource('__WORKSPACE_OID__', 
															'__PROJECT_OID__', 
															'__PROJECT_SCOPING_UP__', 
															'__PROJECT_SCOPING_DOWN__');
	var header = rally.sdk.ui.AppHeader;
	header.showPageTools(true);
	header.removePageTool("print");
	header.addPageTool({
		key:"Previous Version",  
		label:"Previous Version",
		onClick:  function() {
			if (parent && parent.window && parent.window.location) {
				parent.window.location = "http://agilecommons.org/posts/4d4d00c953";
			}
			else {
				window.location = "http://agilecommons.org/posts/4d4d00c953";
			}
		}
	});

	function initialize3DArray(rows, cols) {
        defectData = [cols];
        for (var c = 0; c <= cols; c++) {
            defectData[c] = [];
            for (var r = 0; r <= rows; r++) {
                defectData[c][r] = [];
            }
        }
    }

    function addDefect(column, row, defect) {
        defectData[column][row].push(defect);
    }

    function setOwner(defect) {
        if (defect.Owner !== null) {
            if (defect.Owner.DisplayName !== "") {
                defect.Owner = defect.Owner.DisplayName;
            } else {
                defect.Owner = defect.Owner.LoginName;
            }
        } else {
            defect.Owner = "";
        }
    }

    function findIndex(value, listOfValues) {
        for (var i = 0; i < listOfValues.length; i++) {
            if (listOfValues[i] == value) {
                return i;
            }
        }
        return 0;
        /* Returning 0 to accommodate having null values in the priority field even though the object has "None" in WSAPI */
    }

	// return 3D array by priority, state and list of defects
    function countByPriorityAndState(defectResults) {
        var maxRow = defectResults.defectPriorities.length;
        var maxCol = defectResults.defectStates.length;

        initialize3DArray(maxRow, maxCol);

        // cycle through defects and increment the appropriate state/priority combo in the array
        var row, column;

        for (var i = 0; i < defectResults.defects.length; i++) {
            column = findIndex(defectResults.defects[i].State, defectResults.defectStates);
            row = findIndex(defectResults.defects[i].Priority, defectResults.defectPriorities);
            var defect = defectResults.defects[i];
            addDefect(column, row, defect);
            addDefect(column, maxRow, defect);
            addDefect(maxCol, row, defect);
            addDefect(maxCol, maxRow, defect);
            setOwner(defect);
        }
    }

    var defectQuery = function() {
        var selected = releaseDropdown.getSelectedName();
        var releaseQuery = '(Release.Name = "' + selected + '")';
        var queryObject = [];
        queryObject[0] = { key: 'defectStates', type: 'Defect', attribute: 'State' };
        queryObject[1] = { key: 'defectPriorities', type: 'Defect', attribute: 'Priority' };
        queryObject[2] = {
            key: 'defects',
            type: 'Defect',
            query: releaseQuery,
            fetch: 'FormattedID,Name,State,Priority,ScheduleState,ObjectID,Description,owner,DisplayName,LoginName'
        };
        rallyDataSource.findAll(queryObject, populateTable);
    };

    var destroyDefectList = function() {
        if (defectList) {
            defectList.destroy();
            defectList = null;
            var displayHeader = dojo.byId('displayHeader');

            if(displayHeader) {
                displayHeader.innerHTML = '';
            }
        }
    };

    var populateTable = function (results) {
        var tableDiv = document.getElementById('defects');
        var states = [];
        states[0] = "&nbsp";
        for (var i = 0; i < results.defectStates.length; i++) {
            states[i + 1] = results.defectStates[i];
        }
        states[results.defectStates.length + 1] = total;

        var config = { 'columnKeys': states, 'sortingEnabled' : false };

        if (table) {
            table.destroy();
        }
        table = new rally.sdk.ui.Table(config);

        var priorities = [];
        for (var j = 0; j < results.defectPriorities.length; j++) {
            priorities[j] = results.defectPriorities[j];
            table.setCell(j, 0, priorities[j]);
        }
        table.setCell(results.defectPriorities.length, 0, total);

        countByPriorityAndState(results);

        var onTableClick = function(obj, args) {
            var col = args.columnIndex - 1;
            if (col < 0) {
                return;
            }
            var row = args.rowIndex;
            var displayHeaderDiv = dojo.byId('displayHeader');
            var columnText = args.columnHeader + " ";
            var rowText = obj.getCell(row, 0) + " ";
            var preface = "";
            var postface = "";
            if (columnText === total + " ") {
                columnText = "";
                preface = "All ";
            }
            if (rowText === " ") {
                rowText = "";
                postface = " Without a Priority";
            }
            if (rowText === total + " ") {
                // rowText = "";
                preface = "All ";
            }

            destroyDefectList();

            displayHeaderDiv.innerHTML = preface + columnText + rowText + "Defects " + postface;

            var displayDiv = dojo.byId('display');
            var defectConfig = {
                'columnKeys': ['FormattedID','Name','State','Priority', 'Owner']
            };

            defectList = new rally.sdk.ui.Table(defectConfig);
            defectList.addRows(defectData[col][row]);
            for (var i = 0; i < defectData[col][row].length; i++) {
                var target = rally.sdk.util.Ref.createRallyDetailUrl(defectData[col][row][i]._ref);
                defectList.setCell(i, 0, "<a href=" + target + " target=_blank>" + defectData[col][row][i].FormattedID + "</a>");
            }

            defectList.display(displayDiv);
        };

        table.addEventListener("onCellClick", onTableClick);
        // make formattedID link to work products
        for (var col = 0; col < defectData.length; col++) {
            for (var row = 0; row < defectData[col].length; row++) {
                table.setCell(row, col + 1, "<a href='#' onclick='return false;'>" + defectData[col][row].length + "</a>");
            }
        }
        table.display(tableDiv);
    };

    var releaseDiv = dojo.byId('release');
    var releaseDropdown = new rally.sdk.ui.ReleaseDropdown({}, rallyDataSource);
    var defectList = null;
    var releaseDropdownWrapper = function(obj, args) {
        destroyDefectList();
        defectQuery(obj, args);
    };
    releaseDropdown.display(releaseDiv, releaseDropdownWrapper);
}
