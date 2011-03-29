--
-- Copyright 2011 Primary Technology Ltd
--
-- Licensed under the Apache License, Version 2.0 (the "License");
-- you may not use this file except in compliance with the License.
-- You may obtain a copy of the License at
--
--    http://www.apache.org/licenses/LICENSE-2.0
--
-- Unless required by applicable law or agreed to in writing, software
-- distributed under the License is distributed on an "AS IS" BASIS,
-- WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
-- See the License for the specific language governing permissions and
-- limitations under the License.
-- 

SET SQL_MODE="NO_AUTO_VALUE_ON_ZERO";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8 */;

--
-- Database: `wall`
--

-- --------------------------------------------------------

--
-- Table structure for table `note`
--

CREATE TABLE IF NOT EXISTS `note` (
  `guid` varchar(30) NOT NULL COMMENT 'guid of a note',
  `title` varchar(30) NOT NULL COMMENT 'title given to the note',
  `content` varchar(30) NOT NULL COMMENT 'contents of the note',
  `author` varchar(20) NOT NULL COMMENT 'author of the note',
  `x` int(4) NOT NULL COMMENT 'x coordinate of the note',
  `y` int(4) NOT NULL COMMENT 'y coordinate of the note',
  `wallid` varchar(40) NOT NULL COMMENT 'id of the wall this note exists on',
  PRIMARY KEY (`guid`),
  KEY `wallid` (`wallid`)
) ENGINE=MyISAM DEFAULT CHARSET=latin1;
