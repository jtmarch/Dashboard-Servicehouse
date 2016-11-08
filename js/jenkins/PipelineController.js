angular
    .module('dashboardApp')
    .controller('PipelineController', ['$scope', '$interval', 'PipelineService',
        function ($scope, $interval, PipelineService) {
        var self = this;

        $scope.numberOfPipeLines = 2;
        $scope.jobs = [];
        $scope.position = [];

        self.initialize = function() {
            var rowArray = new Array();
            rowArray.push({blue: false});
            for(var x=0;x<$scope.numberOfPipeLines;x++) {
                $scope.position.push({index: x, rowArray: rowArray});
            }
        };

        self.initialize();

        $scope.firstJob = function(view, buildnr) {
            self.fetchPipelines(view, buildnr);
            //self.fetchJobs(view, buildnr);

            $interval(function() { self.fetchPipelines(view, buildnr); } , 15000);
        };

        self.fetchPipelines = function(view, buildnr) {
            PipelineService.getJobsFromJenkins(view).then(function(data) {

                    var buildName = data.data.pipelines[0].firstJob;
                    var pipeLine = data.data.pipelines[0].pipelines[buildnr];
                    for(var y=0;y<pipeLine.stages.length;y++) {
                        var stage = pipeLine.stages[y];
                        var task = stage.tasks[0];

                        var name = task.name;
                        var buildId = task.buildId;
                        var link = task.link;
                        var duration = task.status.duration;
                        var timestamp = task.status.timestamp;
                        var column = stage.column;
                        var row = stage.row;
                        var status = task.status.type;
                        var percentage = task.status.percentage;

                        var job = undefined;
                        for(var x=0;x<$scope.jobs.length;x++) {
                            var tmpJob = $scope.jobs[x];
                            if(tmpJob.index == column && tmpJob.rowIndex == row) {
                                job = tmpJob;
                                break;
                            }
                        }

                        if(job == undefined){
                            job = new Object();
                        }
                        job.rowIndex = row;
                        job.index = column;
                        job.cucumberFetchSucces = true;
                        job.isNew = true;
                        job.name = name;
                        //job.parentBuildnumber = parentBuildnumber.replace('#', '') * 1;
                        job.displayName = name;
                        job.url = data.url + link;
                        //job.lastResult = data.lastCompletedBuild.result;
                        job.class = status;
                        job.buildNumber = buildId;
                        job.progress = percentage;
                        if(duration != undefined) {
                            job.duration = PipelineService.getDurationAsString(duration) + ' minuten';
                        }
                        if(timestamp != null) {
                            job.time = PipelineService.getDatumAsString(timestamp);
                        } else {
                            job.time = '';
                        }
                        job.building = (status == 'RUNNING');
                        job.isBlue = (status == 'IDLE');

                        self.fillEmptyPositions(job);
                        $scope.jobs.push(job);
                    }
            });
        };

        self.fillEmptyPositions = function(job){
            if($scope.position.length <= job.index){
                //Add new position
                var rowArray = new Array();
                rowArray.push({blue: false});
                $scope.position.push({index: job.index, rowArray: rowArray});
            }
            while($scope.position[job.index].rowArray.length <= job.rowIndex) {
                //Add new row
                $scope.position[job.index].rowArray.push({blue: false});
            }
        };


}]);