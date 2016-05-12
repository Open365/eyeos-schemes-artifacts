(function () {/*
    Copyright (c) 2016 eyeOS

    This file is part of Open365.

    Open365 is free software: you can redistribute it and/or modify
    it under the terms of the GNU Affero General Public License as
    published by the Free Software Foundation, either version 3 of the
    License, or (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU Affero General Public License for more details.

    You should have received a copy of the GNU Affero General Public License
    along with this program. If not, see <http://www.gnu.org/licenses/>.
*/

define('pathJoin',[], function () {
	function pathJoin () {
		var path = arguments[0].replace(/\/+$/, '');
		for (var i = 1; i < arguments.length; i++) {
			path += '/' + arguments[i].replace(/^\/+/, '');
		}
		return path;
	}

	return pathJoin;
});

/*
    Copyright (c) 2016 eyeOS

    This file is part of Open365.

    Open365 is free software: you can redistribute it and/or modify
    it under the terms of the GNU Affero General Public License as
    published by the Free Software Foundation, either version 3 of the
    License, or (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU Affero General Public License for more details.

    You should have received a copy of the GNU Affero General Public License
    along with this program. If not, see <http://www.gnu.org/licenses/>.
*/

define('../settings',['pathJoin'], function (pathJoin) {
	var notifyMap = {
		trash: '/users/%USER%/files/.Trash',
		home: '/users/%USER%/files',
		workgroup: '/users/%USER%/workgroups/%WORKGROUP%',
		network: '/users/%USER%/networkdrives',
		print: '/users/%USER%/print',
		local: '/users/%USER%/local',
		// in the workgroup scheme, which placeholder is %WORKGROUP% (starting by 1)
		_workgroupIndex: 2,
		_usernameIndex: 1
	};

	var cdnMap = {
		home: '/userfiles',
		trash: '/userfiles/.Trash',
		workgroup: '/groupfiles/%WORKGROUP%',
		network: '/networkdrives',
		print: '/printfiles',
		local: '/localfiles',
		// in the workgroup scheme, which placeholder is %WORKGROUP% (starting by 1)
		_workgroupIndex: 1,
		// username not present in the mappings
		_usernameIndex: false
	};

	var settings = {
		// if you add another map, add the corresponding suite in Resolver.test.js!
		notifyMap: notifyMap,
		cdnMap: cdnMap
		// if you add another map, add the corresponding suite in Resolver.test.js!
	};

	return settings;
});

/*
    Copyright (c) 2016 eyeOS

    This file is part of Open365.

    Open365 is free software: you can redistribute it and/or modify
    it under the terms of the GNU Affero General Public License as
    published by the Free Software Foundation, either version 3 of the
    License, or (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU Affero General Public License for more details.

    You should have received a copy of the GNU Affero General Public License
    along with this program. If not, see <http://www.gnu.org/licenses/>.
*/

define('PathInfo',[], function () {
	function PathInfo (eyeosPath, scheme, username, workgroupname) {
		this.eyeosPath = eyeosPath;
		this.scheme = scheme;
		this.username = username;
		this.workgroupName = workgroupname;
	}

	PathInfo.prototype.isUserPath = function () {
		return this.isUserHomePath() || this.scheme === 'network';
	};

	PathInfo.prototype.isUserHomePath = function () {
		return this.scheme === 'home';
	};

	PathInfo.prototype.isWorkgroupPath = function () {
		return this.scheme === 'workgroup';
	};

	PathInfo.prototype.isPrintPath = function () {
		return this.scheme === 'print';
	};

	PathInfo.prototype.getUsername = function () {
		if (this.isWorkgroupPath()) {
			throw new Error("path " + this.eyeosPath + " is not a user or print path");
		}
		if (!this.username) {
			throw new Error("Can't get original username for path " + this.eyeosPath);
		}
		return this.username;
	};

	PathInfo.prototype.getWorkGroupName = function () {
		if (!this.isWorkgroupPath()) {
			throw new Error("path " + this.eyeosPath + " is not a workgroup path");
		}
		return this.workgroupName;
	};

	PathInfo.prototype.getEyeosPath = function () {
		return this.eyeosPath;
	};

	PathInfo.prototype.getRelativePath = function () {
		if (!this.relativePath) {
			// relative path is the local part of the scheme. So
			// for an eyeosPath home:///foo/bar the relPath is /foo/bar
			var stripInitial = this.scheme.length + 3; // +3 for ://

			// for workgroups, the relative part does not include the name of the
			// workgroup
			if (this.isWorkgroupPath()) {
				stripInitial += this.getWorkGroupName().length + 1; // +1 for slash
			}
			return this.eyeosPath.substr(stripInitial);
		}
		return this.relativePath;
	};

	return PathInfo;
});

/*
    Copyright (c) 2016 eyeOS

    This file is part of Open365.

    Open365 is free software: you can redistribute it and/or modify
    it under the terms of the GNU Affero General Public License as
    published by the Free Software Foundation, either version 3 of the
    License, or (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU Affero General Public License for more details.

    You should have received a copy of the GNU Affero General Public License
    along with this program. If not, see <http://www.gnu.org/licenses/>.
*/

define('Resolver',['./PathInfo'], function (PathInfo) {

	function _getEyeosPathFromRegExpMatches (wgIndex, scheme, matches) {
		var path = trimTrailingSlashes(matches.input.substr(matches[0].length)) || '/';
		if (path[0] != '/') {
			return false;
		}
		switch (scheme) {
			case 'home':
			case 'trash':
			case 'print':
			case 'network':
			case 'local':
				return scheme + '://' + path;

			case 'workgroup':
				return scheme + ':///' + matches[wgIndex] + path;

			default:
				return false;
		}
	}

	function trimTrailingSlashes (aPath) {
		return aPath.replace(/\/+$/g, '');
	}

	function _getScheme (eyeosPath) {
		var scheme = eyeosPath.split('://')[0];
		if (!this.map.hasOwnProperty(scheme)) {
			return false;
		}
		return scheme;
	}

	function _getNotifyPath (scheme) {
		var notifyPath = this.map[scheme];
		if (!notifyPath) {
			return false;
		}
		return notifyPath;
	}

	function Resolver (map, pathInfo) {
		var strRegex;
		this.map = map;
		this.PathInfo = pathInfo || PathInfo;
		this.schemeRegexes = {};
		for (var scheme in this.map) {
			if (this.map.hasOwnProperty(scheme) && scheme[0] !== "_") {
				strRegex = this.map[scheme].replace(/%USER%/g, '([^/]+)');
				this.schemeRegexes[scheme] = new RegExp(strRegex.replace(/%WORKGROUP%/g, '([^/]*)'));
			}
		}
	}

	Resolver.prototype.getPath = function (eyeosPath, eyeosUsername) {
		var scheme = _getScheme.call(this, eyeosPath);
		if (!scheme) {
			return false;
		}
		var notifyPath = _getNotifyPath.call(this, scheme);
		if (!notifyPath) {
			return false;
		}

		var parts = eyeosPath.split(/\/+/);
		var path;

		if (scheme === "workgroup") {
			var workgroupName = parts[1];
			notifyPath = notifyPath.replace('%WORKGROUP%', workgroupName);
			path = parts.slice(2).join('/');
		} else {
			path = parts.slice(1).join('/');
		}
		notifyPath = notifyPath.replace('%USER%', eyeosUsername) + '/' + path;
		return notifyPath;
	};

	Resolver.prototype.getEyeosPath = function (notifiedPath) {
		// can be:
		//     /users/john.doe/files/Documents/foo.doc
		//     /users/john.doe/files/
		//     /users/john.doe/workgroups/my workgroup/foo.doc
		//     /users/john.doe/workgroups/
		//     /users/john.doe/print/something.pdf
		//     /workgroups/my workgroup/foo.doc

		var matches;
		for (var scheme in this.schemeRegexes) {
			if (matches = this.schemeRegexes[scheme].exec(notifiedPath)) {
				return _getEyeosPathFromRegExpMatches(this.map._workgroupIndex, scheme, matches);
			}
		}
		return false;
	};

	Resolver.prototype.getSchemeList = function () {
		var schemes = [];
		for (var scheme in this.map) {
			if (this.map.hasOwnProperty(scheme) && scheme[0] !== "_") {
				schemes.push(scheme);
			}
		}
		return schemes;
	};

	Resolver.prototype.getPathInfo = function (path) {
		var matches;
		for (var scheme in this.schemeRegexes) {
			if (matches = this.schemeRegexes[scheme].exec(path)) {
				var eyeosPath = _getEyeosPathFromRegExpMatches(this.map._workgroupIndex, scheme, matches);
				if (eyeosPath) {
					return new this.PathInfo(eyeosPath, scheme, matches[this.map._usernameIndex], matches[this.map._workgroupIndex]);
				}
			}
		}
		return false;
	};

	Resolver.prototype.isEyeosPathEmpty = function (eyeosPath) {
		var index = 1,
			eyeosFilesPath, split;
		var scheme = _getScheme.call(this, eyeosPath);
		if (!scheme) {
			return false;
		}
		if (!_getNotifyPath.call(this, scheme)) {
			return false;
		}

		eyeosFilesPath = eyeosPath.substr(eyeosPath.indexOf("://") + 3);
		split = eyeosFilesPath.split("/");
		if (scheme === "workgroup") {
			index = 2;
		}
		return split[index].length === 0;
	};

	Resolver.prototype.isLocalScheme = function (path) {
		return this.schemeRegexes['local'].test(path);
	};


	return Resolver;
});

/*
    Copyright (c) 2016 eyeOS

    This file is part of Open365.

    Open365 is free software: you can redistribute it and/or modify
    it under the terms of the GNU Affero General Public License as
    published by the Free Software Foundation, either version 3 of the
    License, or (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU Affero General Public License for more details.

    You should have received a copy of the GNU Affero General Public License
    along with this program. If not, see <http://www.gnu.org/licenses/>.
*/

define(['../settings', './Resolver', './pathJoin'], function (settings, Resolver, pathJoin) {
	function ResolverFactory () {

	}

	/**
	 *
	 * @param type
	 * @param options; a map containing diverse options that may be used in the
	 * construction of the resolver.
	 * @returns {Resolver}
	 */
	ResolverFactory.getResolver = function (type, options) {
		switch (type.toLowerCase()) {
			case 'cdn':
				return new Resolver(settings.cdnMap);
			case 'notify':
				return new Resolver(settings.notifyMap);
			case 'filesystem':
				var map = {};
				if (options && options.mountPoint) {
					for (var scheme in settings.notifyMap) {
						if (settings.notifyMap.hasOwnProperty(scheme)) {
							if (scheme[0] !== "_") {
								map[scheme] = pathJoin(options.mountPoint, settings.notifyMap[scheme]);
							} else {
								map[scheme] = settings.notifyMap[scheme];
							}
						}
					}
				} else {
					throw new Error("You need to pass a mountpoint to get the Resolver for " + type);
				}
				return new Resolver(map);

			default:
				throw new Error("Resolver for type " + type + " does not exist.");
		}
	};

	return ResolverFactory;
});

}());