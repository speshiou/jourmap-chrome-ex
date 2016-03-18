(function(angular) {
	'use strict'
	
	angular.module('jmDirectives', [])
	.directive('jmRatingBar', function() {
		return {
			restrict: 'E',
			template: '<span class="jm-ratingbar">&#9734;&#9734;&#9734;&#9734;&#9734;<span>&#9733;&#9733;&#9733;&#9733;&#9733;</span></span>',
			scope: {
				jmRating: '='
			},
			link: function (scope, element, attrs) {
				var maxRating = 5;
				scope.$watch(attrs.jmRating, function(value) {
			    	renderRating(value);
			    });
				
				
				var renderRating = function(rating) {
					element.find("span").css({ width: (rating * 100 / maxRating) + "%" });
				};
				
				renderRating(scope.jmRating);
			}
		}
	});
})(angular);
