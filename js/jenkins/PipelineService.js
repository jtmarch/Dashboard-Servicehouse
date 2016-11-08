angular
    .module('dashboardApp')
    .service('PipelineService', ['$http',
        function ($http) {
        var self = this;

        var url = 'http://jenkins.servicehouse.nl/view/{{view}}/api/json?tree=jobs[name,displayName,downstreamProjects[name],lastCompletedBuild[result],url,builds[actions,estimatedDuration,result,timestamp,duration,number,building,actions[causes[upstreamBuild]]]]';

        self.getJobsFromJenkins = function(view) {
            var jenkinsUrl = self.template(url, {view: view});
            return $http.get(jenkinsUrl);
        };

        self.getProgressIndicatorPercentage = function (startTimeStamp, durationEstimate) {
            var timeInMillis = new Date().getTime();
            var timePast = timeInMillis - startTimeStamp;
            var percentageDone = (100 / durationEstimate) * timePast;
            if (percentageDone > 100) {
                return 100;
            }
            percentageDone = percentageDone + '';
            return percentageDone.split('.')[0];
        };

        self.getDatumAsString = function (timestamp) {
            var d = new Date(timestamp);

            var minuten = d.getMinutes();
            if (minuten < 10) {
                minuten = '0' + minuten;
            }

            return d.getDate() + '-' + (d.getMonth() + 1) + '-' + (d.getYear() + 1900) + ' ' + d.getHours() + ':' + minuten;
        };

        self.getDurationAsString = function (timestamp) {
            var date = new Date();
            var duration = new Date(timestamp);
            var durationStr = duration.getMinutes() + ":";
            if (duration.getSeconds() < 10) {
                durationStr += '0';
            }
            durationStr += duration.getSeconds();
            return durationStr;
        };

        self.template = function(string, dict) {
            return string.replace(/{{([^}]+)}}/g, function(_, key) {
                return dict[key] || '';
            });
        };
    }]);