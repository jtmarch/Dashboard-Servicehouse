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

        $scope.firstJob = function(view, buildName, buildnr) {
            self.fetchJobs(view, buildName, buildnr);

            $interval(function() { self.fetchJobs(view, buildName, buildnr); } , 15000);
        };

        self.fetchJobs = function(view, buildName, buildnr) {
            PipelineService.getJobsFromJenkins(view).then(function(data) {

                var firstJob = data.data.jobs[0];
                for(var x=0;x<data.data.jobs.length;x++){
                    if(data.data.jobs[x].displayName == buildName) {
                        firstJob = data.data.jobs[x];
                        break;
                    }
                }

                self.getJob(firstJob, data.data , 0, 0, "-1", buildnr);
            });
        };

        self.getJob = function(jobData, data, rowIndex, jobIndex, parentBuildnumber, buildnr){
            var jobName = jobData.displayName;

            var job = self.findJob(jobName, rowIndex, jobIndex);
            self.setJobValues(job, jobData, buildnr, parentBuildnumber);

            //De eerste keer en wanneer de job niet blue is dan zijn kinder jobs ophalen.
            for(var index=0;index < jobData.downstreamProjects.length;index++){
                job.downstreamProjects = jobData.downstreamProjects;
                var downStreamJobName = jobData.downstreamProjects[index].name;

                var jobFromDataList = self.findJobInDataList(downStreamJobName, data);

                self.getJob(jobFromDataList, data, job.rowIndex + index, job.index+1, job.buildNumber, buildnr);
            }
        };

        self.findJob = function(jobName, rowIndex, jobIndex){
            var job = undefined;
            for(var x=0;x<$scope.jobs.length;x++){
                if($scope.jobs[x].name == jobName || ($scope.jobs[x].index == jobIndex && $scope.jobs[x].rowIndex == rowIndex)){
                    job = $scope.jobs[x];
                    break;
                }
            }

            if(job == undefined){
                for(var x=0;x<rowIndex;x++){
                    //create dummy placeholders
                    var jobFound = false;
                    for(var y=0;y<$scope.jobs.length;y++){
                        if($scope.jobs[y].index == jobIndex && $scope.jobs[y].rowIndex == x){
                            jobFound = true;
                            break;
                        }
                    }
                    if(jobFound == false){
                        job = self.createJobObj(x, jobIndex);
                        $scope.jobs.push(job);
                    }
                }

                job = self.createJobObj(rowIndex, jobIndex);
                $scope.jobs.push(job);
            }

            return job;
        };

        self.createJobObj = function(rowIndex, jobIndex) {
            var job = new Object();
            job.rowIndex = rowIndex;
            job.index = jobIndex;
            job.cucumberFetchSucces = true;
            job.isNew = true;
            return job;
        };

        self.initJob = function(job, data, parentBuildnumber) {
            job.name = data.displayName;
            job.parentBuildnumber = parentBuildnumber.replace('#', '') * 1;
            job.displayName = data.displayName.replace('moa_cv_', '');
            job.displayName = job.displayName.replace('moa_rt_', '');
            job.url = data.url + '/lastSuccessfulBuild/';
            job.lastResult = data.lastCompletedBuild.result;
        };

        self.setJobAsBlue = function(job) {
            job.class = 'NOT_STARTED';
            job.buildNumber = '';
            job.progress = '';
            job.duration = '';
            job.time = '';
            job.building = false;
            job.isBlue = true;
        };

        self.updateJobFromBuild = function(job, build) {
            job.isBlue = false;
            job.buildNumber = '#' + build.number;
            job.time = PipelineService.getDatumAsString(build.timestamp);
            if(build.duration > 0){
                job.duration = PipelineService.getDurationAsString(build.duration) + ' minuten';
            }

            if(build.building){
                job.building = true;
                job.class = 'BUSY';
                job.progress = PipelineService.getProgressIndicatorPercentage(build.timestamp, build.estimatedDuration);
            } else {
                job.building = false;
                job.class = build.result;
            }
        }

    self.setJobValues = function(job, data, buildNr, parentBuildnumber) {
        self.initJob(job, data, parentBuildnumber);
        var buildNr = self.determineBuildNr(data.builds, job, data.displayName, buildNr);
        var build = data.builds[buildNr];

        self.fillEmptyPositions(job);

        //If this build isn't triggered by the latest parent, then we should conclude that it hasn't run.
        var parentIsBlue = false;
        if(parentBuildnumber != -1) {
            parentIsBlue = self.determineIfParentIsBlue(job, build);
        }

        if(build.building || parentIsBlue == true) {
            $scope.position[job.index].rowArray[job.rowIndex].blue = true;
        } else {
            $scope.position[job.index].rowArray[job.rowIndex].blue = false;
        }

        job.previousState = job.class;

        if(parentIsBlue) {
            self.setJobAsBlue(job);
        } else {
            self.updateJobFromBuild(job, build);
        }
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

    self.determineBuildNr = function(builds, job, displayName, buildNr) {
        if(job.parentBuildnumber == -1) {
            return buildNr;
        }
        for(var x=buildNr;x<buildNr+3;x++){
            if(builds[x].actions.length > 0){
                for(var y=0;y<builds[x].actions.length;y++){
                    if(builds[x].actions[y].causes != undefined) {
                        for(var z=0;z<builds[x].actions[y].causes.length;z++){
                            if(builds[x].actions[y].causes[z].upstreamBuild != undefined && builds[x].actions[y].causes[z].upstreamBuild == job.parentBuildnumber){
                                //Build was triggered by parent build (number)
                                return x;
                            }
                        }
                    }
                }
            }
        }
        return 0;
    };


    self.determineIfParentIsBlue = function(job, build){
        for(var x=0;x<job.index;x++){
            if($scope.position[x].rowArray.length > job.rowIndex) {
                if($scope.position[x].rowArray[job.rowIndex].blue) {
                    return true;
                }
            } else {
                if($scope.position[x].rowArray[0].blue) {
                    return true;
                }
            }
        }

        if(job.parentBuildnumber != -1 && build.actions.length > 0) {
            for(var x=0;x<build.actions.length;x++){
                if(build.actions[x].causes != undefined){
                    for(var y=0;y<build.actions[x].causes.length;y++){
                        if(build.actions[x].causes[y].upstreamBuild != undefined && build.actions[x].causes[y].upstreamBuild != job.parentBuildnumber){
                            //Build was NOT triggered by parent build (number)
                            return true;
                        } else if (build.actions[x].causes[y].upstreamBuild != undefined && build.actions[x].causes[y].upstreamBuild == job.parentBuildnumber){
                            //Build was triggered by parent.
                            return false;
                        }
                    }
                }
            }
        } else if(build.actions == undefined){
            //No actions so not triggered
            return true;
        }
        return true;
    };

    self.findJobInDataList = function(naam, data){
        for(var i=0;i<data.jobs.length;i++){
            if(data.jobs[i].name == naam){
                return data.jobs[i];
            }
        }
    };

}]);