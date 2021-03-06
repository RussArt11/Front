(function () {
    'use strict';

    angular
        .module('angularPoster')
        .controller('ProjectsController', ['firebaseService', '$firebaseObject', function (firebaseService, $firebaseObject) {
            var vm = this,
                firebaseSettings,
                baseObject,
                data;


            vm.projects = {
                vk: {},
                telegram: {}
            };

            vm.postModel = {
                text: '',
                link: ''
            }
            vm.timeModel = new Date(Date.now());
            vm.content = ''
            vm.activeTab = 'edit';
            vm.loading = true;
            vm.publishTimes = []


            function getTimesArray(timesObject) {
                var times = []
                _.map(timesObject, function (el) {
                    times.push(el.time);
                })
                vm.publishTimes = times.slice();
            }

            function processTimeData(projectsType, key, data) {
                var contentItem = data.val().split(' ');

                vm.projects[projectsType][key]['content'][data.getKey()] = {
                    link: contentItem.splice(0, 1)[0],
                    message: contentItem.join(' '),
                    key: data.getKey()
                }
            }

            function processContentData(projectsType, key, data) {
                vm.projects[projectsType][key]['params']['times'] = filterValidData(data.val());
                getTimesArray(vm.projects[projectsType][key]['params']['times'])
            }

            function filterValidData(data) {
                var timePattern = /^([0-9]|0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$/
                var dataSettings = {}
                _.forEach(data, function (value, key) {
                    if (value.toString().match(timePattern)) {
                        dataSettings[key] = {
                            time: value,
                            key: key
                        };
                    }
                })
                return dataSettings;
            }

            function bindEventsContent(projectsType, key) {
                var contentRef = baseObject.$ref().child('content/' + projectsType + '/' + key);
                contentRef.on('child_added', function (data) {
                    processTimeData(projectsType, key, data);
                });
                contentRef.on('child_changed', function (data) {
                    processTimeData(projectsType, key, data);
                });

                contentRef.on('child_removed', function (data) {
                    delete vm.projects[projectsType][key]['content'][data.getKey()]
                });
            }

            function bindEventsSettings(projectsType, key) {
                var contentRef = baseObject.$ref().child('settings/channels/' + projectsType + '/' + key);
                contentRef.on('child_added', function (data) {
                    processContentData(projectsType, key, data);
                });
                contentRef.on('child_changed', function (data) {
                    processContentData(projectsType, key, data);
                });

                contentRef.on('child_removed', function (data) {
                    processContentData(projectsType, key, data);
                });
            }

            function getProjectData(baseObject, projectsType) {
                var settings = baseObject.settings,
                    content = baseObject.content;

                _.forEach(settings.channels[projectsType], function (value, key) {
                    var item = { name: key, params: value, type: projectsType, editMode: false, content: {} }
                    vm.projects[projectsType][key] = item;
                    bindEventsContent(projectsType, key);
                    bindEventsSettings(projectsType, key)
                })

            }

            function firebaseInitCallback(reference) {
                baseObject = $firebaseObject(reference);
                baseObject.$loaded()
                    .then(function () {
                        vm.loading = false;
                        if (baseObject.settings && baseObject.settings.channels) {
                            if (baseObject.settings.channels.telegram) {
                                getProjectData(baseObject, 'telegram')
                            }
                            if (baseObject.settings.channels.vk) {
                                getProjectData(baseObject, 'vk')
                            }

                            var projectKeys = Object.keys(vm.projects.telegram);
                            projectKeys[0] = projectKeys[0] || Object.keys(vm.projects.vk)[0]
                            if (projectKeys[0]) {
                                vm.setActiveProject(vm.projects.telegram[projectKeys[0]]);
                            }


                        }
                    })
                    .catch(function (err) {
                        console.error(err);
                    });
            }

            function init() {
                firebaseService.init().then(firebaseInitCallback)
            }

            init();

            vm.setActiveProject = function (project) {
                if (project) {
                    vm.currentProject = project;
                    getTimesArray(project['params']['times'])
                }
            }

            vm.getDataCount = function (list) {
                return list ? Object.keys(list).length : ''
            }

            vm.addPost = function () {
                var item = baseObject.$ref();
                item.child('content/' + vm.currentProject.type + '/' + vm.currentProject.name).push(vm.postModel.text + ' ' + vm.postModel.link)
                vm.postModel.text = '';
                vm.postModel.link = ''
            }

            vm.saveImportData = function () {
                var item = baseObject.$ref();
                var child = item.child('content/' + vm.currentProject.type + '/' + vm.currentProject.name);
                var contentData = vm.content.split('\n');
                _.forEach(contentData, function (el) {
                    if (el.length > 0) {
                        child.push(el);
                    }

                })
                vm.content = '';
                vm.activeTab = 'edit';
            }

            vm.showContent = function ($fileContent) {
                vm.content = $fileContent;
            };

            vm.addTime = function () {
                if (!vm.timeModel) {
                    return;
                }
                var item = baseObject.$ref();
                var timeString = vm.timeModel.toTimeString().slice(0, 5)
                item.child('settings/channels/' + vm.currentProject.type + '/' + vm.currentProject.name + '/times/').push(timeString)
                vm.timeModel = new Date(Date.now());
            }


            vm.deleteTime = function (time) {
                var item = baseObject.$ref();
                item.child('settings/channels/' + vm.currentProject.type + '/' + vm.currentProject.name + '/times/' + time.key).remove();
            }


            vm.editPost = function (post, flag) {
                post.editMode = !!flag;
            }

            vm.savePost = function (post) {
                var item = baseObject.$ref();
                item.child('content/' + vm.currentProject.type + '/' + vm.currentProject.name + '/' + post.key).set(post.link + ' ' + post.message);
                post.editMode = false;
            }

            vm.deletePost = function (post) {
                var item = baseObject.$ref();
                item.child('content/' + vm.currentProject.type + '/' + vm.currentProject.name + '/' + post.key).remove();
            }

        }]);

})();