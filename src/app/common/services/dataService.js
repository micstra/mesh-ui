function dataServiceProvider() {

    var apiUrl;

    this.setApiUrl = function(value) {
        apiUrl = value;
    };

    this.$get = function dataService(Restangular) {

        Restangular.setBaseUrl(apiUrl);

        var projects = Restangular.all('projects');

        function getProjects() {
            return projects.getList();
        }

        return {
            getProjects: getProjects
        };
    };
}

angular.module('caiLunAdminUi.common')
    .config(function(RestangularProvider) {
        // basic auth credentials: joe1:test123
        // header string: Authorization: Basic am9lMTp0ZXN0MTIz
        RestangularProvider.setDefaultHeaders({ "Authorization": "Basic am9lMTp0ZXN0MTIz"});
    })
    .provider('dataService', dataServiceProvider);