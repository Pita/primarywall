--
-- Copyright 2011 Primary Technology Ltd
--
-- This program is free software: you can redistribute it and/or modify
-- it under the terms of the GNU Affero General Public License as
-- published by the Free Software Foundation, either version 3 of the
-- License, or (at your option) any later version.
--
-- This program is distributed in the hope that it will be useful,
-- but WITHOUT ANY WARRANTY; without even the implied warranty of
-- MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
-- GNU Affero General Public License for more details.
--
-- You should have received a copy of the GNU Affero General Public License
-- along with this program.  If not, see <http://www.gnu.org/licenses/>.
-- 

--
-- If you are doing an upgrade from V<1 you will need to do ALTER table note add column color varchar(10)
-- Before you run that command look to see if a color column exists in note first.
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
  `guid` varchar(50) NOT NULL COMMENT 'guid of a note',
  `title` varchar(30) NOT NULL COMMENT 'title given to the note',
  `content` varchar(200) NOT NULL COMMENT 'contents of the note',
  `author` varchar(20) NOT NULL COMMENT 'author of the note',
  `x` int(4) NOT NULL COMMENT 'x coordinate of the note',
  `y` int(4) NOT NULL COMMENT 'y coordinate of the note',
  `wallid` varchar(80) NOT NULL COMMENT 'id of the wall this note exists on',
  `color` varchar(10) NOT NULL COMMENT 'the color of the note',
  PRIMARY KEY (`guid`),
  KEY `wallid` (`wallid`)
) ENGINE=MyISAM DEFAULT CHARSET=latin1;



