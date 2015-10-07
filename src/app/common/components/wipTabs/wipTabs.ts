angular.module('meshAdminUi.common')
    .directive('wipTabs', wipTabs)
    .controller('wipTabsDialogController', WipTabsDialogController);

/**
 * Directive work-in-progress (WIP) tabs which allow switching between open editor views.
 *
 * @param {ng.ui.IStateService} $state
 * @param {ng.material.MDDialogService} $mdDialog
 * @param editorService
 * @param i18nService
 * @param wipService
 * @param dataService
 * @param notifyService
 *
 * @returns {ng.IDirective} Directive definition object
 */
function wipTabs($state, $mdDialog, editorService, i18nService, wipService, dataService, notifyService) {

    /**
     * @param {ng.IScope} $scope
     */
    function wipTabsController($scope) {
        var vm = this,
            wipType = 'contents',
            lastIndex = 0;

        vm.wips = [];
        vm.modified = [];
        vm.selectedIndex = 0;
        vm.isModified = isModified;
        vm.closeWip = closeWip;
        vm.open = open;
        vm.lang = i18nService.getCurrentLang().code;
        vm.displayTabs = true;

        wipService.registerWipChangeHandler(wipChangeHandler);
        editorService.registerOnOpenCallback(editorOpenHandler);
        $scope.$on('$stateChangeStart', stateChangeStartHandler);
        $scope.$on('$stateChangeSuccess', stateChangeSuccessHandler);
        window.addEventListener('beforeunload', persistOpenWipsLocally);

        wipChangeHandler(); // populate with WIPs on load.

        /**
         * Has the WIP with the specified uuid been modified?
         * @param {string} uuid
         * @returns {boolean}
         */
        function isModified(uuid) {
            return -1 < vm.modified.indexOf(uuid);
        }

        function open(uuid) {
            editorService.open(uuid);
            editorOpenHandler(uuid);
        }

        /**
         * Close a WIP tab and remove the WIP item from the wipService,
         * automatically switching to another tab or the list view.
         *
         * @param {Event} event
         * @param {number} index
         */
        function closeWip(event, index) {
            var wip = vm.wips[index].item,
                projectName = vm.wips[index].metadata.projectName;

            event.stopPropagation();
            event.preventDefault();
            lastIndex = vm.selectedIndex;

            if (wipService.isModified(wipType, wip)) {
                showDialog().then(function(response) {
                    if (response === 'save') {
                        dataService.persistContent(projectName, wip);
                        notifyService.toast('SAVED_CHANGES');
                    }
                    wipService.closeItem(wipType, wip);
                    transitionIfCurrentTabClosed(index);
                });
            } else {
                wipService.closeItem(wipType, wip);
                transitionIfCurrentTabClosed(index);
            }
        }

        /**
         * Display the close confirmation dialog box. Returns a promise which is resolved
         * to 'save', 'discard', or rejected if user cancels.
         * @return {ng.IPromise<String>}
         */
        function showDialog() {
            return $mdDialog.show({
                templateUrl: 'common/components/wipTabs/wipTabsCloseDialog.html',
                controller: 'wipTabsDialogController',
                controllerAs: 'vm'
            });
        }

        /**
         * If the current tab has been closed, go to the explorer state, else stay in current state.
         */
        function transitionIfCurrentTabClosed(closedTabIndex) {
            if (closedTabIndex === lastIndex) {
                $state.go('projects.explorer');
            }
        }

        /**
         * Callback to be invoked whenever the contents of the wipService changes
         * i.e. an item is added or removed. Keeps the UI in sync with the
         * wip store.
         */
        function wipChangeHandler() {
            vm.wips = wipService.getOpenItems(wipType);
            vm.modified = wipService.getModifiedItems(wipType);
            vm.selectedIndex = indexByUuid(vm.wips, editorService.getOpenNodeId());
        }

        function editorOpenHandler(uuid) {
            vm.selectedIndex = indexByUuid(vm.wips, uuid);
        }

        /**
         * Establishes the currently-selected tab upon the user transitioning state
         * to a contentEditor view, or deselects all tabs if not in that view.
         *
         * @param {Object} event
         * @param {Object} toState
         * @param {Object} toParams
         */
        function stateChangeSuccessHandler(event, toState, toParams) {
            if (toParams && toParams.uuid) {
                vm.selectedIndex = indexByUuid(vm.wips, toParams.uuid);
            } else {
                vm.selectedIndex = -1;
            }
            vm.explorer = toState.name === 'projects.explorer';
        }

        /**
         * Since tab contents are relative to a project, we don't want to display the tabs
         * in the "projects list" view. They should only be visible from within the context a
         * selected project.
         *
         * @param event
         * @param toState
         */
        function stateChangeStartHandler(event, toState) {
            vm.displayTabs = toState.name !== 'projects.list';
        }

        /**
         * Persist any open WIPs to the browser's localStorage.
         */
        function persistOpenWipsLocally() {
            wipService.persistLocal();
        }

        /**
         * Get the index of a given WIP item in the collection by its uuid.
         * @param {Array} collection
         * @param {String} uuid
         * @returns {number}
         */
        function indexByUuid(collection, uuid) {
            return collection.map(function(wip) {
                return wip.item.uuid;
            }).indexOf(uuid);
        }
    }

    return {
        restrict: 'E',
        templateUrl: 'common/components/wipTabs/wipTabs.html',
        controller: wipTabsController,
        controllerAs: 'vm',
        scope: {}
    };
}

/**
 * Controller used to set the return value of the close dialog box.
 *
 * @param {ng.material.MDDialogService} $mdDialog
 * @constructor
 */
function WipTabsDialogController($mdDialog) {
    var vm = this;

    vm.save = function() {
        $mdDialog.hide('save');
    };
    vm.discard = function() {
        $mdDialog.hide('discard');
    };
    vm.cancel = function() {
        $mdDialog.cancel();
    };
}